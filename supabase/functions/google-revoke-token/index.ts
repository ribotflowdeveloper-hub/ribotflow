import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";

/**
 * Aquesta Edge Function s'encarrega de REVOCAR l'accés que un usuari ha donat a la nostra aplicació.
 * Parla directament amb l'API de Google per invalidar el 'refresh_token'.
 * Està dissenyada per ser cridada des d'un entorn segur del servidor (una Server Action),
 * per això no necessita capçaleres CORS.
 */
serve(async (req) => {
  try {
    // Creem un client de Supabase autenticat com l'usuari que fa la petició.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verifiquem la identitat de l'usuari.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // Busquem el 'refresh_token' de l'usuari a la nostra base de dades.
    const { data: creds } = await supabase
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    // Si l'usuari no tenia cap token guardat, no cal fer res.
    if (!creds?.refresh_token) {
      return new Response(JSON.stringify({ message: "No hi havia cap token per revocar." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Fem una crida a l'endpoint de revocació de Google, passant el token que volem invalidar.
    await fetch(`https://oauth2.googleapis.com/revoke?token=${creds.refresh_token}`, {
      method: 'POST',
      headers: { 'Content-type': 'application/x-www-form-urlencoded' }
    });

    // Aquesta funció només s'encarrega de parlar amb Google. L'eliminació del token
    // de la nostra pròpia base de dades es gestiona a la Server Action que ha cridat
    // aquesta funció, per a una millor separació de responsabilitats.
    return new Response(JSON.stringify({ message: "Petició de revocació enviada a Google." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Gestió d'errors.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});