// src/app/(app)/settings/layout.tsx

import { SettingsNav } from './_components/settings-nav'; // La teva barra de navegació

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Barra de navegació lateral */}
      <aside className="flex-shrink-0 lg:w-64">
        <SettingsNav />
      </aside>

      {/* Contingut de la pàgina activa (profile, billing, etc.) */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}