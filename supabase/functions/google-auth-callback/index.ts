// supabase/functions/google-auth-callback/index.ts

import { serve } from 'https-deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const userId = url.searchParams.get('state');

    if (!code || !userId) throw new Error('Falta el codi o l\'ID d\'usuari');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-auth-callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokens = await response.json();
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) throw new Error('No s\'ha rebut el refresh token de Google.');

    const { error } = await supabaseAdmin
      .from('user_credentials')
      .upsert({ 
        user_id: userId, 
        provider: 'google',
        refresh_token: refreshToken
      }, { onConflict: 'user_id, provider' });
    
    if (error) throw error;
    
    // Aquí utilitzem una URL de la teva aplicació local per a la redirecció
    const appUrl = Deno.env.get('VITE_APP_URL') || 'http://localhost:5173';
    return Response.redirect(`${appUrl}/settings/integrations?status=success`);

  } catch (error) {
    console.error(error);
    const appUrl = Deno.env.get('VITE_APP_URL') || 'http://localhost:5173';
    return Response.redirect(`${appUrl}/settings/integrations?status=error`);
  }
});