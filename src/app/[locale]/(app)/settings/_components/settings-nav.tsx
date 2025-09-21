/**
 * @file SettingsNav.tsx
 * @summary Component de navegació per a la secció de Configuració,
 * ara adaptable per a escriptori i mòbil.
 */
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { User, CreditCard, Users, Puzzle, Wrench, ShieldOff } from 'lucide-react';
import { cn, getCleanPathname } from '@/lib/utils';

const settingsNavItems = [
  { id: 'profile', labelKey: 'profile', icon: User, path: '/settings/profile' },
  { id: 'billing', labelKey: 'billing', icon: CreditCard, path: '/settings/billing' },
  { id: 'team', labelKey: 'team', icon: Users, path: '/settings/team' },
  { id: 'integrations', labelKey: 'integrations', icon: Puzzle, path: '/settings/integrations' },
  { id: 'blacklist', labelKey: 'blacklist', icon: ShieldOff, path: '/settings/blacklist' },
  { id: 'customization', labelKey: 'customization', icon: Wrench, path: '/settings/customization' },
];

export function SettingsNav() {
  const t = useTranslations('SettingsPage.nav');
  const fullPathname = usePathname();
  const locale = useLocale();
  const cleanPathname = getCleanPathname(fullPathname, locale);

  return (
    // Aquest <nav> és ara un contenidor flexible.
    <nav className="flex flex-col gap-4">
      {/* El títol principal només es mostra en pantalles grans */}
      <h1 className="text-3xl font-bold mb-4 hidden lg:block">{t('title')}</h1>
      
      {/* ✅ DISSENY ADAPTABLE:
        - En mòbil ('flex-row'), és una fila.
        - En escriptori ('lg:flex-col'), és una columna.
        - 'overflow-x-auto' permet fer scroll horitzontal en mòbil si no hi caben tots els elements.
      */}
      <ul className="flex flex-row lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1 overflow-x-auto pb-2 -mb-2">
        {settingsNavItems.map(item => {
          // Comprovem si l'enllaç està actiu
          const isActive = cleanPathname === item.path;
          return (
            <li key={item.id} className="flex-shrink-0">
              <Link
                href={`/${locale}${item.path}`}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-accent text-sm lg:text-base',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{t(item.labelKey as string)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
