import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LINKEDIN_REVOKE_URL = 'https://www.linkedin.com/oauth/v2/revoke';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // ✅ CORRECCIÓ CLAU: Busquem el proveïdor amb el nom correcte 'linkedin_oidc'.
    const { data: creds } = await supabase
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "linkedin_oidc") // <-- AQUEST ERA L'ERROR
      .single();

    if (!creds?.refresh_token) {
      return new Response(JSON.stringify({ message: "No hi havia cap token de LinkedIn per revocar." }), {
        headers: { "Content-Type": "application/json" }, status: 200
      });
    }
    
    const body = new URLSearchParams();
    body.append('token', creds.refresh_token);
    body.append('client_id', Deno.env.get('LINKEDIN_CLIENT_ID')!);
    body.append('client_secret', Deno.env.get('LINKEDIN_CLIENT_SECRET')!);

    await fetch(LINKEDIN_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    return new Response(JSON.stringify({ message: "Petició de revocació enviada a LinkedIn." }), {
      headers: { "Content-Type": "application/json" }, status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" }, status: 500
    });
  }
});
