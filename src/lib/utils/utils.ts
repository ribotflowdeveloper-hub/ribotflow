import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from 'dompurify';

/**
 * Funció d'utilitat per fusionar classes de Tailwind CSS de forma intel·ligent.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Elimina el prefix de l'idioma d'una ruta.
 */
export const getCleanPathname = (pathname: string, locale: string): string => {
    const prefix = `/${locale}`;
    return pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;
};

/**
 * Saneja una cadena HTML per evitar atacs XSS.
 */
export function sanitizeHtml(html: string | null | undefined, options?: DOMPurify.Config): string {
  if (typeof window === 'undefined' || !html) {
    return '';
  }

  const configToUse = options || { ALLOWED_TAGS: [], ALLOWED_ATTR: [] };
  
  // ✅ SOLUCIÓ CORRECTA: Ignorem l'error de tipus esperat amb @ts-expect-error.
  // Si en el futur l'error desapareix, el compilador ens avisarà.
  // @ts-expect-error TypeScript is confused by the DOMPurify config type in this context.
  return DOMPurify.sanitize(html, configToUse);
}