/**
 * @file SettingsNav.tsx
 * @summary Aquest fitxer defineix el component de navegació lateral per a la secció de Configuració.
 * És un component de client reutilitzable que mostra els diferents apartats de la configuració
 * i ressalta l'enllaç actiu basant-se en la ruta actual de la URL.
 */


"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { User, CreditCard, Users, Puzzle, Wrench, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils'; // Utilitat de ShadCN per a classes condicionals
// Definim els elements de navegació en un array.
// Aquest patró fa que sigui molt fàcil afegir, eliminar o reordenar enllaços en el futur.
const settingsNavItems = [
  { id: 'profile', labelKey: 'profile', icon: User, path: '/settings/profile' },
  { id: 'billing', labelKey: 'billing', icon: CreditCard, path: '/settings/billing' },
  { id: 'team', labelKey: 'team', icon: Users, path: '/settings/team' },
  { id: 'integrations', labelKey: 'integrations', icon: Puzzle, path: '/settings/integrations' },
  { id: 'blacklist', labelKey: 'blacklist', icon: ShieldOff, path: '/settings/blacklist' },
  { id: 'customization', labelKey: 'customization', icon: Wrench, path: '/settings/customization' },
];
/**
 * @function SettingsNav
 * @summary El component que renderitza el menú de navegació.
 */
export function SettingsNav() {
  
  const t = useTranslations('SettingsPage.nav');
  const pathname = usePathname(); // Aquest pathname no té l'idioma
  const locale = useLocale();
  return (
    <nav>
  <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>
  <ul className="space-y-2">
        {/* Mapegem l'array d'elements per renderitzar cada enllaç. */}

        {settingsNavItems.map(item => (
          <li key={item.id}>
            <Link
              href={`/${locale}${item.path}`} // ✅ Construïm l'enllaç amb l'idioma
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-accent',
                // La funció 'cn' aplica la classe 'bg-primary' només si la ruta actual coincideix amb la de l'ítem.
                pathname === item.path && 'bg-primary text-primary-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{t(item.labelKey as string)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}