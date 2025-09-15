import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Funció d'utilitat per fusionar classes de Tailwind CSS de forma intel·ligent.
 * És una eina estàndard en projectes amb shadcn/ui.
 * * Què fa?
 * 1. Utilitza 'clsx' per unir classes, permetent lògica condicional (ex: `cn({ 'bg-red-500': hasError })`).
 * 2. Utilitza 'twMerge' per resoldre conflictes de classes de Tailwind. Per exemple,
 * si li passes 'p-2' i 'p-4', el resultat final serà només 'p-4', eliminant la redundància.
 * * @param inputs Les classes a fusionar.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}