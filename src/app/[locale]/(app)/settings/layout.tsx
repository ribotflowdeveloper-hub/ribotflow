import { SettingsNav } from "./_components/settings-nav";

// Aquest component de layout envoltarà totes les pàgines de la secció de configuració.
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // En pantalles grans (lg), creem una graella de dues columnes.
    // En pantalles més petites, els elements es col·loquen un a sobre de l'altre.
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-12 space-y-8 lg:space-y-0">
      <aside className="lg:col-span-1">
        {/* El menú de navegació */}
        <SettingsNav />
      </aside>
      <main className="lg:col-span-1">
        {/* Aquí es renderitzarà el contingut de cada pàgina (perfil, facturació, etc.) */}
        {children}
      </main>
    </div>
  );
}
