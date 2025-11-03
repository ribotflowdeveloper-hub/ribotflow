import { createClient } from 'supabase-admin'; // ✅ CORREGIT
import { serve } from 'std/http/server.ts'; // ✅ CORREGIT
import { corsHeaders } from '../_shared/cors.ts';
import { processPost } from './_lib/processPost.ts';
import { getScheduledPosts } from './_lib/db.ts';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function handler(req: Request): Promise<Response> {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        SERVICE_ROLE_KEY || ''
    );

    const postsToProcess = await getScheduledPosts(supabaseAdmin);
    if (postsToProcess.length === 0) {
        return new Response(JSON.stringify({ message: "No hi ha publicacions per a enviar." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    console.log(`[INFO] S'han trobat ${postsToProcess.length} publicacions per a processar.`);
    
    // Utilitzem Promise.allSettled per evitar que un error en un post aturi tots els altres
    const results = await Promise.allSettled(
      postsToProcess.map(post => processPost(post, supabaseAdmin))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[FATAL] Error irrecuperable processant el post ID ${postsToProcess[index].id}:`, result.reason);
      }
    });

    console.log("--- [SUCCESS] Funció finalitzada correctament. ---");
    return new Response(JSON.stringify({ status: 'ok', processed: postsToProcess.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
}

// Servidor principal
serve(async (req) => {
    if (!SERVICE_ROLE_KEY) {
        console.error("[FATAL ERROR] La variable d'entorn SUPABASE_SERVICE_ROLE_KEY no està definida.");
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }
    
    // Ignorem les peticions OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
        return await handler(req);
    } catch (error) {
        console.error("[FATAL ERROR]", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders });
    }
});