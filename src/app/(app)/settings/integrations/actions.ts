"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// --- GOOGLE ACTIONS ---
export async function connectGoogleAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  // ✅ NOU: Guardem el proveïdor en una cookie abans de redirigir.
  // Aquesta cookie només serà accessible des del servidor (httpOnly).
  (await
    // ✅ NOU: Guardem el proveïdor en una cookie abans de redirigir.
    // Aquesta cookie només serà accessible des del servidor (httpOnly).
    cookieStore).set('oauth_provider', 'google', { path: '/', httpOnly: true });

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/settings/integrations`,
      scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
      queryParams: { access_type: 'offline', prompt: 'consent' }
    },
  });

  if (error) {
    console.error("Error en generar l'enllaç de vinculació amb Google:", error);
    return redirect('/settings/integrations?error=google_link_failed');
  }

  redirect(data.url);
}

// --- MICROSOFT ACTIONS ---
export async function connectMicrosoftAction() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }
  
  // ✅ NOU: Guardem el proveïdor en una cookie abans de redirigir.
  (await
    // ✅ NOU: Guardem el proveïdor en una cookie abans de redirigir.
    cookieStore).set('oauth_provider', 'azure', { path: '/', httpOnly: true });

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'azure',
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/settings/integrations`,
      scopes: 'openid email offline_access User.Read Mail.Read Mail.Send',
    },
  });

  if (error) {
    console.error("Error en generar l'enllaç de vinculació amb Microsoft:", error);
    return redirect('/settings/integrations?error=microsoft_link_failed');
  }

  redirect(data.url);
}


// --- FUNCIONS DE DESCONNEXIÓ (sense canvis) ---

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
