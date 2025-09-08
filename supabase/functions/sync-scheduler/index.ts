import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: users, error } = await supabaseAdmin
      .from("user_credentials")
      .select("user_id");

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users to sync." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Invoquem la funció 'sync-worker' per a cada usuari en paral·lel
    const invocations = users.map(user => 
      supabaseAdmin.functions.invoke('sync-worker', {
        body: { userId: user.user_id }
      })
    );

    await Promise.all(invocations);

    console.log(`[Scheduler] ${users.length} sync workers have been dispatched.`);
    return new Response(JSON.stringify({ message: `${users.length} sync workers dispatched.` }), {
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
