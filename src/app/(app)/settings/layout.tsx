// Aquest arxiu és un "Layout Component" de Next.js.
// Defineix una estructura visual compartida per a totes les pàgines
// que estiguin dins de la carpeta /settings.

import { SettingsNav } from './_components/settings-nav';

/**
 * Aquest layout crea l'estructura de dues columnes per a la secció de configuració:
 * una barra lateral de navegació a l'esquerra i l'àrea de contingut a la dreta.
 * @param {React.ReactNode} children - 'children' és una propietat especial de React
 * que representa el contingut de la pàgina actual que s'està renderitzant dins
 * d'aquest layout (ex: el contingut de ProfilePage, BillingPage, etc.).
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Barra de navegació lateral, comuna a totes les pàgines de configuració. */}
      <aside className="flex-shrink-0 lg:w-64">
        <SettingsNav />
      </aside>

      {/* Contingut de la pàgina activa (profile, billing, etc.).
          Next.js injectarà automàticament el component de la pàgina corresponent aquí. */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}