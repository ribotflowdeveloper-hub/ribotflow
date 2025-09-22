import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Funció principal que s'executa quan la Server Action la crida
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, invitation_token, inviter_name, team_name } = await req.json();
    
    // Client que actua en nom de l'usuari per verificar l'autenticació
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // ✅ NOU: Client d'administrador per saltar-se RLS de forma segura
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Busquem el refresh_token amb el client admin
    const { data: creds, error: credsError } = await supabaseAdmin // <-- Canvi aquí
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (credsError || !creds?.refresh_token) {
      throw new Error("L'usuari que convida no té un compte de Google connectat.");
    }

    // 2. Utilitzem el refresh_token per obtenir un nou access_token de Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error("No s'ha pogut refrescar el token de Google.");
    const accessToken = tokenData.access_token;

    // 3. Construïm i enviem el correu a través de l'API de Gmail
    const invitationLink = `${Deno.env.get('NEXT_PUBLIC_SITE_URL')}/auth/accept-invitation?token=${invitation_token}`;
    const subject = `${inviter_name} t'ha convidat a unir-te a ${team_name} a Ribotflow`;
    const body = `
      <p>Hola!</p>
      <p>Has rebut una invitació per unir-te a l'equip '${team_name}' a Ribotflow.</p>
      <p><a href="${invitationLink}">Fes clic aquí per acceptar la invitació</a></p>
      <p>Si no esperaves aquesta invitació, pots ignorar aquest correu.</p>
    `;
    
    // L'API de Gmail requereix que el correu estigui codificat en base64url
    const emailMessage = [
      `From: "Ribotflow" <${user.email}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\n');
    const base64EncodedEmail = btoa(emailMessage).replace(/\+/g, '-').replace(/\//g, '_');

    await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64EncodedEmail }),
    });

    return new Response(JSON.stringify({ message: "Invitation sent!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
})