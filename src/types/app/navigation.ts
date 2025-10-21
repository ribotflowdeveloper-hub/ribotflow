// src/types/navigation.ts
import type { LucideIcon } from 'lucide-react';

/**
 * @summary Aquesta constant defineix TOTES les claus de traducció possibles per a la navegació.
 * És la nostra font única de la veritat. Si afegeixes un nou element al menú,
 * has d'afegir la seva 'labelKey' aquí primer.
 */
export const NAVIGATION_KEYS = [
  'dashboard', 'crm', 'finances', 'communication', 'network', 'architecture',
  'crmGeneral', 'contacts', 'pipeline', 'quotes', 'concepts', 'activities', // ✅ 'concepts' i 'activities' afegits
  'invoicing', 'expenses', 'inbox', 'templates', 'marketing', 'profile', 'customization',
  'ai', 'settings', 'planner', 'calendar', 'projects', 'tasks', 'reports', 'suppliers', 'billing', 'team', 'integrations', 'blacklist', 'customization', 'install', 'permissions'
] as const;

/**
 * @summary Aquest tipus es genera automàticament a partir de la constant de dalt.
 * Crea una unió de tots els possibles valors: 'dashboard' | 'crm' | 'finances' | ...
 */
export type NavigationKey = typeof NAVIGATION_KEYS[number];

/**
 * @summary Aquesta és la interfície per a cada element de navegació.
 * Ara utilitza 'NavigationKey' per assegurar que 'labelKey' sempre sigui un valor vàlid.
 */
export interface NavItem {
  id: string;
  labelKey: NavigationKey; // ✅ Ara és totalment segur i tipat.
  descKey?: NavigationKey; // ✅ NOU: Clau per a la descripció (opcional).
  icon: LucideIcon;
  path: string;
  isSingle: boolean;
  basePath?: string;
  children?: NavItem[];
  notImplemented?: boolean;
  // ✅ AQUÍ AFEGIM LA NOVA PROPIETAT
  // És opcional ('?') perquè no tots els enllaços requeriran un pla específic.
  // Serà un array de strings, ex: ['plus', 'premium'].
  requiredPlan?: string[];
  allowedRoles?: string[]; // Rols que poden accedir (ex: ['owner', 'admin'])


}