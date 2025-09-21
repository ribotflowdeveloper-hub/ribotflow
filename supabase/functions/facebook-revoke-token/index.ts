import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // Busquem el token de la pàgina de Facebook de l'usuari
    const { data: creds } = await supabase
      .from("user_credentials")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "facebook")
      .single();

    if (!creds?.access_token) {
      return new Response(JSON.stringify({ message: "No hi havia cap token de Facebook per revocar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // L'endpoint per a revocar permisos a Facebook és /me/permissions
    // Utilitzem el token de la pàgina, que està lligat a l'usuari que va donar els permisos.
    const revokeUrl = `https://graph.facebook.com/v19.0/me/permissions`;
    const body = new URLSearchParams({
        access_token: creds.access_token
    });

    const response = await fetch(revokeUrl, {
      method: 'DELETE',
      body: body
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error de l'API de Facebook en revocar:", errorData);
    }
    
    return new Response(JSON.stringify({ message: "Petició de revocació enviada a Facebook." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
