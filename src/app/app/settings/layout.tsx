import type { Metadata } from 'next';
import { SettingsNav } from './_components/settings-nav'; // Component client per a la navegació

export const metadata: Metadata = {
  title: 'Configuració | Ribot',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Configuració</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="flex-shrink-0 lg:w-64">
          <SettingsNav />
        </aside>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}