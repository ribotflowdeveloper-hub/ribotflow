// supabase/functions/sync-scheduler/index.ts
import { createClient } from "@supabase/supabase-js"; // <-- Corregit: import per àlies
import { serve } from "std/http/server.ts";         // <-- Corregit: import per àlies

serve(async (req) => {
    // Comprovació de seguretat (Bearer token)
    const authHeader = req.headers.get('Authorization');
    // Usem SUPABASE_SERVICE_ROLE_KEY com a secret per a la crida del cron
    const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`; 

    if (!authHeader || authHeader !== expectedAuth) {
        console.warn("[Scheduler] Intent d'accés no autoritzat.");
        return new Response('Unauthorized', { status: 401 });
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    try {
        console.log("[Scheduler] Iniciant cerca de credencials per a sincronitzar...");
        
        // ✅ CONSULTA CORREGIDA PER INCLOURE TOTS ELS PROVEÏDORS ACTIUS
        // Busquem credencials que tinguin 'refresh_token' (OAuth) O 'encrypted_password' (IMAP)
        const { data: credentials, error: dbError } = await supabaseAdmin
            .from("user_credentials")
            .select("user_id, provider")
            .or('refresh_token.not.is.null,encrypted_password.not.is.null'); // Condició OR per agafar tots els actius

        if (dbError) throw dbError; // Llança l'error de la base de dades

        if (!credentials || credentials.length === 0) {
            console.log("[Scheduler] No s'han trobat credencials actives per a sincronitzar.");
            return new Response(JSON.stringify({ message: "No hi ha credencials actives per a sincronitzar." }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[Scheduler] S'han trobat ${credentials.length} credencials actives. Disparant workers...`);

        // Invoquem un worker per a cada credencial trobada
        const invocations = credentials.map((cred) => 
            supabaseAdmin.functions.invoke('sync-worker', {
                body: { userId: cred.user_id, provider: cred.provider }
            })
        );
        
        // Esperem que totes les invocacions s'hagin enviat (no que acabin)
        await Promise.all(invocations);

        console.log(`[Scheduler] ${credentials.length} sync workers disparats.`);
        return new Response(JSON.stringify({ message: `${credentials.length} workers disparats.` }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: unknown) { // <-- Corregit: tipat com unknown
        // Comprovem si és un Error abans d'accedir a .message
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[Scheduler Error General]:", errorMessage);
        
        // Retornem l'error en format JSON
        return new Response(JSON.stringify({ error: errorMessage }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});