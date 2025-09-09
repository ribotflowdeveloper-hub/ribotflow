"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// --- GOOGLE ACTIONS ---
export async function connectGoogleAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Construïm la URL de retorn, indicant que volem tornar a la pàgina d'integracions.
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/settings/integrations`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
      redirectTo, // ✅ CORRECCIÓ: Utilitzem la nova URL
      queryParams: { access_type: 'offline', prompt: 'consent' }
    },
  });

  if (error) {
    console.error("Error en iniciar OAuth amb Google:", error);
    return { error: "No s'ha pogut obtenir la URL de Google." };
  }
  if (data.url) {
    redirect(data.url);
  }
}

export async function disconnectGoogleAction() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no trobat." };

    await supabase.functions.invoke('google-revoke-token');
    
    const { error } = await supabase.from('user_credentials').delete().match({ user_id: user.id, provider: 'google' });
    if (error) return { success: false, message: "No s'ha pogut desconnectar el compte de Google." };

    return { success: true, message: "Compte de Gmail desconnectat correctament." };
}

// --- MICROSOFT ACTIONS ---
export async function connectMicrosoftAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Fem el mateix per a Microsoft.
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/settings/integrations`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'openid email offline_access User.Read Mail.Read Mail.Send',
      redirectTo, // ✅ CORRECCIÓ: Utilitzem la nova URL
    },
  });

  if (error) {
    console.error("Error en iniciar OAuth amb Microsoft:", error);
    return { error: "No s'ha pogut obtenir la URL de Microsoft." };
  }
  if (data.url) {
    redirect(data.url);
  }
}

export async function disconnectMicrosoftAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no trobat." };
  
  await supabase.functions.invoke('microsoft-revoke-token');
  
  const { error } = await supabase.from('user_credentials').delete().match({ user_id: user.id, provider: 'azure' });
  if (error) return { success: false, message: "No s'ha pogut desconnectar el compte de Microsoft." };

  return { success: true, message: "Compte de Microsoft/Outlook desconnectat correctament." };
}