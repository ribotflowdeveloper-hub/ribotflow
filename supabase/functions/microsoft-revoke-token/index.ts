import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuari no autenticat")

    const { data: creds } = await supabase
      .from('user_credentials')
      .select('refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'azure') // Busquem la credencial d'Azure/Microsoft
      .single()

    if (!creds?.refresh_token) {
      return new Response(JSON.stringify({ message: "No hi havia cap token de Microsoft per revocar." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    // Endpoint de revocació de Microsoft
    const revokeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/revoke'
    const params = new URLSearchParams()
    params.append('token', creds.refresh_token)
    
    // Microsoft no requereix client_id/secret per a la revocació del refresh_token
    await fetch(revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    return new Response(JSON.stringify({ message: "Token de Microsoft revocat correctament." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})