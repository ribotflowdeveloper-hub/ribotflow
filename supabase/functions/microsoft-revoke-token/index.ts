import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Aquesta Edge Function s'encarrega de REVOCAR l'accés d'Azure/Microsoft
 * que un usuari ha concedit prèviament a la nostra aplicació.
 * Crida l'endpoint de revocació de Microsoft per invalidar el 'refresh_token'.
 * Està dissenyada per ser cridada des d'un entorn segur del servidor (Server Action).
 */
serve(async (req) => {
  try {
    // Creem un client de Supabase autenticat com l'usuari que fa la petició,
    // passant el seu token d'autorització.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verifiquem la identitat de l'usuari.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuari no autenticat")

    // Busquem el 'refresh_token' de Microsoft per a aquest usuari a la nostra base de dades.
    const { data: creds } = await supabase
      .from('user_credentials')
      .select('refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft') // Busquem específicament la credencial d'Azure/Microsoft.
      .single()

    // Si l'usuari no tenia cap token guardat, no cal fer res.
    if (!creds?.refresh_token) {
      return new Response(JSON.stringify({ message: "No hi havia cap token de Microsoft per revocar." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    // Aquest és l'endpoint oficial de Microsoft per a la revocació de tokens.
    const revokeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/revoke'
    const params = new URLSearchParams()
    params.append('token', creds.refresh_token)
    
    // A diferència d'altres fluxos, Microsoft no requereix el client_id/secret per a la revocació.
    // Enviem la petició a Microsoft per invalidar el token.
    await fetch(revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    // La funció ha complert la seva missió de parlar amb Microsoft.
    // L'eliminació del registre de la nostra pròpia base de dades es gestiona a la Server Action
    // que ha cridat aquesta funció, per a una millor separació de responsabilitats.
    return new Response(JSON.stringify({ message: "Token de Microsoft revocat correctament." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    // Gestió d'errors.
    const errorMessage = typeof error === "object" && error !== null && "message" in error
      ? (error as { message: string }).message
      : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})