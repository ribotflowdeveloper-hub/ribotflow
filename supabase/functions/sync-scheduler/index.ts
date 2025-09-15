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

    // Obtenim l'ID de tots els usuaris que tenen credencials desades (és a dir, que han connectat un compte de correu).
    const { data: users, error } = await supabaseAdmin
      .from("user_credentials")
      .select("user_id");

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No hi ha usuaris per sincronitzar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- LÒGICA CLAU: INVOCACIÓ DELS WORKERS ---
    // Per a cada usuari trobat, creem una promesa que invoca la funció 'sync-worker' de manera asíncrona.
    // El 'sync-worker' s'encarregarà de la feina pesada de sincronitzar els correus d'UN sol usuari.
    const invocations = users.map(user => 
      supabaseAdmin.functions.invoke('sync-worker', {
        body: { userId: user.user_id }
      })
    );

    // Utilitzem 'Promise.all' per executar totes les invocacions en paral·lel.
    // El planificador no espera que els 'workers' acabin; simplement els "engega" i acaba la seva pròpia execució.
    // Això fa que el planificador sigui molt ràpid i eficient.
    await Promise.all(invocations);

    console.log(`[Scheduler] S'han engegat ${users.length} 'sync workers'.`);
    return new Response(JSON.stringify({ message: `S'han engegat ${users.length} 'sync workers'.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[Scheduler Error]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
