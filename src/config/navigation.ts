import {
  LayoutDashboard,
  Briefcase,
  Landmark,
  Activity,
  Headphones,
  LayoutTemplate,
  Mail,
  Contact,
  FileText,
  Columns,
  Receipt,
  Bot,
  Settings
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  isSingle: boolean;
  basePath?: string;
  children?: NavItem[];
  notImplemented?: boolean;
}

export const navModules: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Tauler', 
    icon: LayoutDashboard, 
    path: '/dashboard', 
    isSingle: true 
  },
  { 
    id: 'crm',
    label: 'CRM',
    icon: Briefcase,
    basePath: '/crm',
    path: '/crm/general', // Path per defecte en clicar el mòdul
    isSingle: false,
    children: [
      { id: 'general_crm', label: 'CRM General', icon: Briefcase, path: '/crm/general', isSingle: true },
      { id: 'contactes', label: 'Contactes', icon: Contact, path: '/crm/contactes', isSingle: true },
      { id: 'pipeline', label: 'Pipeline', icon: Columns, path: '/crm/pipeline', isSingle: true },
      { id: 'pressupostos', label: 'Pressupostos', icon: FileText, path: '/crm/quotes', isSingle: true },
      { id: 'activitats', label: 'Activitats', icon: Activity, path: '/crm/activitats', isSingle: true }
    ]
  },
  { 
    id: 'finances',
    label: 'Finances',
    icon: Landmark,
    basePath: '/finances',
    path: '/finances/facturacio',
    isSingle: false,
    children: [
      { id: 'facturacio', label: 'Facturació', icon: Receipt, path: '/finances/facturacio', isSingle: true },
      { id: 'despeses', label: 'Despeses', icon: Landmark, path: '/finances/despeses', isSingle: true }, 
    ]
  },
  { 
    id: 'comunicacio',
    label: 'Comunicació',
    icon: Headphones,
    basePath: '/comunicacio',
    path: '/comunicacio/inbox',
    isSingle: false,
    children: [
      { id: 'inbox', label: 'Safata d\'Entrada', icon: Headphones, path: '/comunicacio/inbox', isSingle: true },
      { id: 'templates', label: 'Plantilles', icon: LayoutTemplate, path: '/comunicacio/templates', isSingle: true },
      { id: 'marketing', label: 'Màrqueting', icon: Mail, path: '/comunicacio/marketing', isSingle: true },
    ]
  },
];

export const bottomItems: NavItem[] = [
  { id: 'ai', label: 'IA Automàtica', icon: Bot, path: '#', isSingle: true, notImplemented: true },
  // Apuntem a /settings/profile per defecte, que és més coherent.
  { id: 'settings', label: 'Configuració', icon: Settings, path: '/settings/profile', isSingle: true }, 
];
