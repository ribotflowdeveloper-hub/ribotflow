import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const LINKEDIN_API_VERSION = '202509';

type SocialPost = {
  id: string;
  user_id: string;
  team_id: string;
  provider: string;
  content?: string | null;
  media_url?: string | null;
  media_type?: string | null;
};

serve(async (req) => {
  console.log("--- [INFO] 'publish-scheduled-posts' function invoked. ---");
  try {
    const authHeader = req.headers.get('Authorization')!;
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: posts, error: postsError } = await supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts found to publish." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log(`[INFO] Found ${posts.length} posts to process.`);
    
    for (const post of posts) {
      console.log(`\n[INFO] Processing Post ID: ${post.id} for Team ID: ${post.team_id}`);
      
      const { data: creds, error: credsError } = await supabaseAdmin
        .from('team_credentials')
        .select('access_token, provider_user_id')
        .eq('team_id', post.team_id)
        .eq('provider', post.provider)
        .single();

      if (credsError || !creds?.access_token || !creds.provider_user_id) {
        const errorMsg = `Valid team credentials not found for the post.`;
        console.error(`[ERROR] Post ID ${post.id}: ${errorMsg}`, credsError);
        await handlePublishError(supabaseAdmin, post, errorMsg);
        continue;
      }
      console.log(`[INFO] Post ID ${post.id}: Credentials found.`);

      try {
        let requestBody: object;

        // ✅ THIS IS THE CORRECTED LOGIC
        // Check if the post has an image and call the upload function.
        if (post.media_url && post.media_type === 'image') {
          console.log(`[INFO] Post ID ${post.id}: Image found. Starting upload process to LinkedIn...`);
          const assetURN = await uploadImageToLinkedIn(post.media_url, creds.access_token, creds.provider_user_id);
          console.log(`[INFO] Post ID ${post.id}: Image uploaded successfully. Asset URN: ${assetURN}`);
          
          requestBody = {
            author: `urn:li:person:${creds.provider_user_id}`,
            commentary: post.content!,
            visibility: 'PUBLIC',
            distribution: {
              feedDistribution: 'MAIN_FEED',
              targetEntities: [],
              thirdPartyDistributionChannels: [],
            },
            content: {
              media: {
                id: assetURN
              }
            },
            lifecycleState: 'PUBLISHED',
          };
        } else {
          // Logic for text-only posts
          console.log(`[INFO] Post ID ${post.id}: No image found. Processing as text-only post.`);
          requestBody = {
            author: `urn:li:person:${creds.provider_user_id}`,
            commentary: post.content!,
            visibility: 'PUBLIC',
            distribution: {
              feedDistribution: 'MAIN_FEED',
              targetEntities: [],
              thirdPartyDistributionChannels: [],
            },
            lifecycleState: 'PUBLISHED',
          };
        }
        
        console.log(`[INFO] Post ID ${post.id}: Sending request to LinkedIn API...`);
        const response = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${creds.access_token}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': LINKEDIN_API_VERSION,
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(JSON.stringify(errorBody));
        }
        
        console.log(`[SUCCESS] Post ID ${post.id}: Published successfully to LinkedIn.`);
        await handlePublishSuccess(supabaseAdmin, post);
        
      } catch (e) {
        console.error(`[ERROR] Post ID ${post.id}: Failed to publish to LinkedIn.`, e.message);
        await handlePublishError(supabaseAdmin, post, e.message);
      }
    }

    console.log("--- [SUCCESS] Function finished correctly. ---");
    return new Response(JSON.stringify({ status: 'ok', processed: posts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  
  } catch (error) {
    console.error("--- [FATAL ERROR] Function failed unexpectedly. ---", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});



// Helper function to upload an image to LinkedIn (multi-step process)
async function uploadImageToLinkedIn(mediaUrl: string, accessToken: string, providerUserId: string): Promise<string> {
  // ✅ API CALL UPDATE: Use the new v3 endpoint
  const registerResponse = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LINKEDIN_API_VERSION, // ✅ Utilitzem la nova versió
    },
    body: JSON.stringify({
      "initializeUploadRequest": {
        "owner": `urn:li:person:${providerUserId}`
      }
    })
  });
  if (!registerResponse.ok) throw new Error("Error registering image upload with LinkedIn.");
  const registerData = await registerResponse.json();
  const uploadUrl = registerData.value.uploadUrl;
  const assetURN = registerData.value.image;

  // Download image from Supabase and upload to LinkedIn's URL
  const imageResponse = await fetch(mediaUrl);
  if (!imageResponse.ok) throw new Error("Could not download image from Supabase Storage.");
  const imageBlob = await imageResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': imageBlob.type, 'Authorization': `Bearer ${accessToken}` },
    body: imageBlob,
  });
  if (!uploadResponse.ok) throw new Error("Error uploading image to LinkedIn.");

  return assetURN;
}

// ✅ PAS 1: Eliminem la definició duplicada del tipus 'SocialPost'.

// ✅ PAS 2: Utilitzem els tipus específics en lloc de 'any'.
async function handlePublishSuccess(supabase: SupabaseClient, post: SocialPost) {
  await supabase
      .from('social_posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', post.id);

  // Use team_id for notifications
  await supabase.from('notifications').insert({
      user_id: post.user_id, // The original author
      team_id: post.team_id,
      message: `Your LinkedIn post has been published successfully.`,
      type: 'post_published'
  });
}

async function handlePublishError(supabase: SupabaseClient, post: SocialPost, errorMessage: string) {
  await supabase
      .from('social_posts')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', post.id);
  
  await supabase.from('notifications').insert({
      user_id: post.user_id, // The original author
      team_id: post.team_id,
      message: `Error publishing to LinkedIn: "${post.content?.substring(0, 20)}...".`,
      type: 'post_failed'
  });
}
