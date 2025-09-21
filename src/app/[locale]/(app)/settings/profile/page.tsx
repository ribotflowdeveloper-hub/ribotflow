import { getTranslations } from "next-intl/server";
import { ProfileData } from "./_components/ProfileData";
import { Suspense } from "react";

// Aquest és un exemple de com hauria de ser una pàgina de contingut
// dins de la secció de configuració.
export default async function ProfilePage() {
  const t = await getTranslations('SettingsPage.nav');

  return (
    <div className="space-y-8">
      {/* ✅ NOU: Afegim el títol aquí, però només el mostrem en pantalles petites (lg:hidden)
          perquè en escriptori ja apareix al menú lateral. */}
      <h1 className="text-3xl font-bold lg:hidden">{t('title')}</h1>
      
      {/* El teu contingut, com el formulari de perfil, va aquí */}
      <Suspense fallback={<div>Carregant perfil...</div>}>
        <ProfileData />
      </Suspense>
    </div>
  );
}
