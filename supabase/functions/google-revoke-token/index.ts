import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";

// Aquesta funció ara és més simple: sense CORS.
// Està dissenyada per ser cridada des d'un entorn de servidor segur.
serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    const { data: creds } = await supabase
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    // Si no hi ha credencials, no cal fer res.
    if (!creds?.refresh_token) {
      return new Response(JSON.stringify({ message: "No hi havia cap token per revocar." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Intentem revocar el token a Google
    await fetch(`https://oauth2.googleapis.com/revoke?token=${creds.refresh_token}`, {
      method: 'POST',
      headers: { 'Content-type': 'application/x-www-form-urlencoded' }
    });

    // La funció ha complert la seva missió de parlar amb Google.
    // L'eliminació de la base de dades la farem des de la Server Action per més control.
    return new Response(JSON.stringify({ message: "Petició de revocació enviada a Google." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});