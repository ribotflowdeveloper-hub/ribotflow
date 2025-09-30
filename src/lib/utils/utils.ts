import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Funció d'utilitat per fusionar classes de Tailwind CSS de forma intel·ligent.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ AFEGEIX AQUESTA FUNCIÓ AQUÍ SOTA
/**
 * Elimina el prefix de l'idioma d'una ruta.
 * @param pathname - La ruta completa (ex: /ca/dashboard).
 * @param locale - L'idioma actual (ex: ca).
 * @returns La ruta neta (ex: /dashboard).
 */
export const getCleanPathname = (pathname: string, locale: string): string => {
    const prefix = `/${locale}`;
    // Si la ruta comença amb el prefix, l'elimina. Si el resultat és un string buit, retorna '/'.
    return pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;
};