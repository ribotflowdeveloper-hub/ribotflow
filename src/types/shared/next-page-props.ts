/**
 * Tipus base per a pàgines del directori App Router
 * (compatible amb Next.js 15 i React 19 RC)
 */
export interface PageProps {
  /**
   * Paràmetres dinàmics de la URL (async a Next 15)
   */
  params: Promise<Record<string, string>> | Record<string, string>;

  /**
   * Paràmetres de cerca (query string)
   */
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}
