import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
    // Comprovació de seguretat
    const authHeader = req.headers.get('Authorization')!;
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    try {
        console.log("[Scheduler] Iniciant cerca de credencials per a sincronitzar...");
        
        // ✅ CONSULTA CORREGIDA I SIMPLIFICADA
        // Ara només busquem credencials amb un 'refresh_token'. La lògica de l'equip ja no és rellevant aquí.
        const { data: credentials, error } = await supabaseAdmin
            .from("user_credentials")
            .select("user_id, provider")
            .in('provider', ['google', 'microsoft'])
            .not('refresh_token', 'is', null); // Única condició necessària

        if (error) throw error;

        if (!credentials || credentials.length === 0) {
            console.log("[Scheduler] No s'han trobat credencials vàlides per a sincronitzar.");
            return new Response(JSON.stringify({ message: "No hi ha credencials vàlides per a sincronitzar." }));
        }

        console.log(`[Scheduler] S'han trobat ${credentials.length} credencials vàlides. Disparant workers...`);

        const invocations = credentials.map((cred) => 
            supabaseAdmin.functions.invoke('sync-worker', {
                body: { userId: cred.user_id, provider: cred.provider }
            })
        );
        await Promise.all(invocations);

        console.log(`[Scheduler] ${credentials.length} sync workers disparats amb èxit.`);
        return new Response(JSON.stringify({ message: `${credentials.length} workers disparats.` }));

    } catch (error) {
        console.error("[Scheduler Error General]:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});