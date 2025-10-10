import {
  LayoutDashboard,
  Briefcase,
  Landmark,
  Headphones,
  LayoutTemplate,
  Mail,
  Contact,
  FileText,
  Columns,
  Receipt,
  Bot,
  BookPlus,
  Settings,
  Users,
  Workflow,
  Activity,
  CalendarDays, // ✅ Importem la nova icona

} from 'lucide-react';


// ✅ PAS 1: Importem la interfície des del nostre nou fitxer de tipus.
import type { NavItem } from '@/types/app/navigation';

export const navModules: NavItem[] = [
  { 
    id: 'dashboard', 
    labelKey: 'dashboard', // ✅ Canviat
    icon: LayoutDashboard, 
    path: '/dashboard', 
    isSingle: true 
  },
  { 
    id: 'crm',
    labelKey: 'crm', // ✅ Canviat
    icon: Briefcase,
    basePath: '/crm',
    path: '/crm/general',
    isSingle: false,
    children: [
      { id: 'general_crm', labelKey: 'crmGeneral', icon: Briefcase, path: '/crm/general', isSingle: true },
      { id: 'contactes', labelKey: 'contacts', icon: Contact, path: '/crm/contactes', isSingle: true },
      { id: 'pipeline', labelKey: 'pipeline', icon: Columns, path: '/crm/pipeline', isSingle: true },
      { id: 'pressupostos', labelKey: 'quotes', icon: FileText, path: '/crm/quotes', isSingle: true },
      { id: 'conceptes', labelKey: 'concepts', icon: BookPlus, path: '/crm/products', isSingle: true },
      { id: 'activitats', labelKey: 'activities', icon: Activity, path: '/crm/activitats', isSingle: true }
    ]
  },
  { 
    id: 'finances',
    labelKey: 'finances', // ✅ Canviat
    icon: Landmark,
    basePath: '/finances',
    path: '/finances/facturacio',
    isSingle: false,
    children: [
      { id: 'facturacio', labelKey: 'invoicing', icon: Receipt, path: '/finances/facturacio', isSingle: true },
      { id: 'despeses', labelKey: 'expenses', icon: Landmark, path: '/finances/despeses', isSingle: true }, 
    ]
  },
  { 
    id: 'comunicacio',
    labelKey: 'communication', // ✅ Canviat
    icon: Headphones,
    basePath: '/comunicacio',
    path: '/comunicacio/inbox',
    isSingle: false,
    children: [
      { id: 'inbox', labelKey: 'inbox', icon: Headphones, path: '/comunicacio/inbox', isSingle: true },
      { id: 'templates', labelKey: 'templates', icon: LayoutTemplate, path: '/comunicacio/templates', isSingle: true },
      { id: 'marketing', labelKey: 'marketing', icon: Mail, path: '/comunicacio/marketing', isSingle: true },
      {
        id: 'planificador',
        labelKey: 'planner',
        icon: CalendarDays,
        path: '/comunicacio/planificador',
        // ✅ AQUÍ ESTÀ LA MÀGIA: Especifiquem els plans que tenen accés
        requiredPlan: ['plus', 'premium'],
        isSingle: false
      },
    ]
  },
  {
    id: 'network',
    labelKey: 'network', // ✅ Canviat
    icon: Users,
    path: '/network',
    isSingle: true
  },

  {
    id: 'projectStrocture',
    labelKey: 'architecture', // ✅ Canviat
    icon: Workflow,
    path: '/projectStrocture',
    isSingle: true
  },
];

export const bottomItems: NavItem[] = [
  { id: 'ai', labelKey: 'ai', icon: Bot, path: '#', isSingle: true, notImplemented: true },
  { id: 'settings', labelKey: 'settings', icon: Settings, path: '/settings/profile', isSingle: true }, 
];