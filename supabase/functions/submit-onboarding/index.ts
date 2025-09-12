// /supabase/functions/submit-onboarding/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profileData, userId } = await req.json();
    if (!profileData || !userId) throw new Error("Falten dades del perfil o l'ID de l'usuari.");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Primer, guardem les dades del perfil que ens arriben del formulari
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileData)
      .eq('id', userId);

    if (updateError) throw updateError;
    console.log(`Perfil ${userId} actualitzat amb dades bàsiques.`);

    // 2. Després, fem la geocodificació
    let coordinates = { latitude: null, longitude: null };
    if (profileData.company_address) {
      const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        profileData.company_address
      )}.json?access_token=${mapboxToken}&limit=1`;
      
      const geoResponse = await fetch(geocodingUrl);
      const geoData = await geoResponse.json();

      if (geoData.features && geoData.features.length > 0) {
        const [longitude, latitude] = geoData.features[0].center;
        coordinates = { latitude, longitude };
        console.log(`Coordenades trobades per ${userId}:`, coordinates);

        // 3. I les guardem a la base de dades
        await supabaseAdmin
          .from('profiles')
          .update(coordinates)
          .eq('id', userId);
      } else {
        console.log(`No s'han trobat coordenades per a l'adreça: ${profileData.company_address}`);
      }
    }

    return new Response(JSON.stringify({ message: "Perfil actualitzat correctament" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error a la funció submit-onboarding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});