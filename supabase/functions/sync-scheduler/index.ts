import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
    // Comprovació de seguretat per a assegurar que només Supabase Cron pot cridar aquesta funció
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
        
        // ✅ CONSULTA ACTUALITZADA I MÉS ROBUSTA
        // Ara només seleccionem credencials que siguin vàlides per a la sincronització:
        // han de tenir un 'refresh_token' i un 'team_id' associat.
        const { data: credentials, error } = await supabaseAdmin
            .from("user_credentials")
            .select("user_id, provider")
            .in('provider', ['google', 'microsoft']) // Només per a proveïdors de correu
            .not('refresh_token', 'is', null)       // Condició 1: Ha de tenir un refresh_token
            .not('team_id', 'is', null);            // Condició 2: Ha de tenir un equip associat

        if (error) throw error;

        if (!credentials || credentials.length === 0) {
            console.log("[Scheduler] No s'han trobat credencials vàlides per a sincronitzar.");
            return new Response(JSON.stringify({ message: "No hi ha credencials vàlides per a sincronitzar." }));
        }

        console.log(`[Scheduler] S'han trobat ${credentials.length} credencials vàlides. Disparant workers...`);

        // Invoquem un 'worker' separat per a CADA credencial vàlida.
        // Això fa que el sistema sigui més resilient: si una sincronització falla, les altres no s'aturen.
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