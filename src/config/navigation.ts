/**
 * @file navigation.ts
 * @summary Aquest fitxer actua com la "font única de la veritat" (single source of truth) per a
 * tota l'estructura de navegació de l'aplicació. Centralitzar la navegació aquí
 * fa que sigui extremadament fàcil afegir, eliminar, reordenar o modificar mòduls i enllaços
 * sense haver de tocar múltiples components.
 */

import {
    LayoutDashboard, Briefcase, Landmark, Activity, Headphones, LayoutTemplate,
    Mail, Contact, FileText, Columns, Receipt, Bot, BookPlus, Settings, Users
  } from 'lucide-react';
  import type { LucideIcon } from 'lucide-react';
  
  // Definim una interfície per a un element de navegació. Això assegura que tots els
  // objectes de navegació tinguin una estructura consistent i previsible.
  export interface NavItem {
    id: string; // Identificador únic per a l'element.
    label: string; // El text que es mostrarà a la UI.
    icon: LucideIcon; // El component d'icona de Lucide.
    path: string; // La ruta a la qual navega l'enllaç.
    isSingle: boolean; // Indica si és un mòdul amb submenú (false) o un enllaç directe (true).
    basePath?: string; // La ruta base per a un mòdul, per saber quan ha d'estar actiu.
    children?: NavItem[]; // Un array de sub-elements de navegació (per als mòduls).
    notImplemented?: boolean; // Un flag per a funcionalitats futures.
  }
  
  /**
   * @summary Defineix els mòduls principals de la barra de navegació lateral.
   */

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
      { id: 'conceptes', label: 'Conceptes', icon: BookPlus, path: '/crm/products', isSingle: true },

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
  {
    id: 'network',
    label: 'Xarxa Professional',
    icon: Users, // O una altra icona que t'agradi
    path: '/network',
    isSingle: true
  },
];

export const bottomItems: NavItem[] = [
  { id: 'ai', label: 'IA Automàtica', icon: Bot, path: '#', isSingle: true, notImplemented: true },
  // Apuntem a /settings/profile per defecte, que és més coherent.
  { id: 'settings', label: 'Configuració', icon: Settings, path: '/settings/profile', isSingle: true }, 
];
