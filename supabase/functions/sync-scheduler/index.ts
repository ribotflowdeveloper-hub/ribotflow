/**
 * @file index.ts (sync-scheduler)
 * @summary Aquesta és una Supabase Edge Function que actua com un "planificador" (scheduler).
 * La seva única responsabilitat és ser invocada periòdicament (per exemple, cada hora mitjançant
 * un Cron Job de Supabase) per iniciar el procés de sincronització per a tots els usuaris
 * que hagin connectat el seu compte de correu.
 *
 * Aquesta funció NO fa la sincronització directament. En lloc d'això, obté una llista de tots
 * els usuaris que necessiten sincronitzar i després invoca una altra funció ('sync-worker')
 * per a cadascun d'ells, distribuint la càrrega de treball.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Capçaleres CORS per permetre que la funció sigui cridada.
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (_req) => {
    // Responem a les peticions pre-vol (preflight) de CORS.
    if (_req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Creem un client de Supabase amb privilegis d'administrador (SERVICE_ROLE_KEY).
        // És necessari per poder consultar dades de tots els usuaris sense restriccions de RLS.
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 🔄 MODIFICAT: Ara seleccionem tant l'ID de l'usuari com el proveïdor.
        const { data: credentials, error } = await supabaseAdmin
            .from("user_credentials")
            .select("user_id, provider")
            // ✅ MILLORA: Filtrem només per proveïdors de correu per no intentar sincronitzar LinkedIn, etc.
            .in('provider', ['google', 'azure']);

        if (error) throw error;

        if (!credentials || credentials.length === 0) {
            return new Response(JSON.stringify({ message: "No user credentials to sync." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            });
        }

        // --- LÒGICA CLAU: INVOCACIÓ DELS WORKERS ---
        // Per a cada usuari trobat, creem una promesa que invoca la funció 'sync-worker' de manera asíncrona.
        // El 'sync-worker' s'encarregarà de la feina pesada de sincronitzar els correus d'UN sol usuari.
        // 🔄 MODIFICAT: Invoquem la funció 'sync-worker' per a cada combinació d'usuari/proveïdor.
        const invocations = credentials.map((cred) => supabaseAdmin.functions.invoke('sync-worker', {
            body: {
                userId: cred.user_id,
                provider: cred.provider // <-- ARA SÍ QUE ENVIEM EL PROVIDER!
            }
        }));

        // Utilitzem 'Promise.all' per executar totes les invocacions en paral·lel.
        // El planificador no espera que els 'workers' acabin; simplement els "engega" i acaba la seva pròpia execució.
        // Això fa que el planificador sigui molt ràpid i eficient.
        await Promise.all(invocations);
        console.log(`[Scheduler] ${credentials.length} sync workers have been dispatched.`);
        return new Response(JSON.stringify({ message: `${credentials.length} sync workers dispatched.` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });
    } catch (err) {
        console.error("[Scheduler Error]", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
});