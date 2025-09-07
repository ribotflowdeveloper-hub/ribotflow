"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Acció per començar el procés de connexió amb Google
export async function connectGoogleAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations`, // URL on tornarà Google
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    },
  });

  if (error) {
    console.error("Error en iniciar OAuth:", error);
    return { error: "No s'ha pogut obtenir la URL de Google." };
  }

  // Si tot va bé, redirigim l'usuari a la URL d'autenticació de Google
  if (data.url) {
    redirect(data.url);
  }
}

// Acció per desconnectar de Google
export async function disconnectGoogleAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Primer, obtenim l'usuari de forma segura
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Usuari no trobat." };
  }

  // Invoquem la funció per revocar el token a Google
  const { error: invokeError } = await supabase.functions.invoke('google-revoke-token');
  if (invokeError) {
    console.error("Error en invocar google-revoke-token:", invokeError);
    // No aturem el procés, ja que igualment volem esborrar la credencial
  }

  // Finalment, esborrem la credencial de la nostra base de dades
  const { error: deleteError } = await supabase
    .from('user_credentials')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google');
  
  if (deleteError) {
    console.error("Error en esborrar la credencial:", deleteError);
    return { success: false, message: "No s'ha pogut desconnectar el compte." };
  }

  return { success: true, message: "Compte de Gmail desconnectat correctament." };
}