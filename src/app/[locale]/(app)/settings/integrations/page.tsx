import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { IntegrationsClient } from "./_components/IntegrationsClient";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations('SettingsPage.integrations');
  return {
    title: t('title'),
  };
}

// Aquest és el component de servidor que s'executa primer.
export default async function IntegrationsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  // Valors per defecte si l'usuari no està connectat o no té credencials.
  const connectionStatuses = {
    google: false,
    microsoft: false,
    linkedin: false,
    facebook: false, // ✅ Canviat a minúscula per consistència
    instagram: false, // ✅ Canviat a minúscula per consistència
  };

  if (user) {
    // ✅ AQUESTA ÉS LA LÒGICA CORRECTA:
    // Anem a la taula 'user_credentials' a buscar les connexions actives.
    const { data: credentials } = await supabase
      .from('user_credentials')
      .select('provider')
      .eq('user_id', user.id);

    if (credentials) {
      // Mirem quins proveïdors ha trobat i actualitzem l'estat.
      // Aquests noms han de coincidir EXACTAMENT amb els que guardes al callback.
      connectionStatuses.google = credentials.some(c => c.provider === 'google');
      connectionStatuses.microsoft = credentials.some(c => c.provider === 'microsoft');
      connectionStatuses.linkedin = credentials.some(c => c.provider === 'linkedin_oidc');
      connectionStatuses.facebook = credentials.some(c => c.provider === 'facebook');
      connectionStatuses.instagram = credentials.some(c => c.provider === 'instagram');
    }
  }

  // Passem aquest objecte al component de client.
  // Quan fem 'router.refresh()', aquest codi es torna a executar i el client rep l'estat actualitzat.
  return <IntegrationsClient initialConnectionStatuses={connectionStatuses} />;
}

