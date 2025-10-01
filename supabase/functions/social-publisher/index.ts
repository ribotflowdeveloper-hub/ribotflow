// Ubicació: /supabase/functions/social-publisher/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { processPost } from './_lib/processPost.ts';
import { getScheduledPosts } from './_lib/db.ts';

// ✅ CORRECCIÓ CLAU: La variable es defineix a l'inici, fora de qualsevol funció.
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function handler(req: Request): Promise<Response> {
    const authHeader = req.headers.get('Authorization');
    // Ara la comparació utilitza la constant definida a l'inici.
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
    await Promise.all(postsToProcess.map(post => processPost(post, supabaseAdmin)));

    console.log("--- [SUCCESS] Funció finalitzada correctament. ---");
    return new Response(JSON.stringify({ status: 'ok', processed: postsToProcess.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
}

// Servidor principal
serve(async (req) => {
    // ✅ CORRECCIÓ CLAU: Es comprova la variable abans d'executar res.
    if (!SERVICE_ROLE_KEY) {
        console.error("[FATAL ERROR] La variable d'entorn SUPABASE_SERVICE_ROLE_KEY no està definida.");
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }
    try {
        return await handler(req);
    } catch (error) {
        console.error("[FATAL ERROR]", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});