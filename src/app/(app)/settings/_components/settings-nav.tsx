"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, CreditCard, Users, Puzzle, Wrench, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils'; // Utilitat de ShadCN per a classes condicionals

const settingsNavItems = [
  { id: 'profile', label: 'Perfil', icon: User, path: '/settings/profile' },
  { id: 'billing', label: 'Facturació', icon: CreditCard, path: '/settings/billing' },
  { id: 'team', label: 'Equip', icon: Users, path: '/settings/team' },
  { id: 'integrations', label: 'Integracions', icon: Puzzle, path: '/settings/integrations' },
  { id: 'blacklist', label: 'Filtre Inbox', icon: ShieldOff, path: '/settings/blacklist' },
  { id: 'customization', label: 'Personalització', icon: Wrench, path: '/settings/customization' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav>
      <ul className="space-y-2">
        {settingsNavItems.map(item => (
          <li key={item.id}>
            <Link
              href={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-accent',
                pathname === item.path && 'bg-primary text-primary-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}