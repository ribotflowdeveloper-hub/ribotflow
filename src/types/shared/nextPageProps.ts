// src/types/shared/next-page-props.ts

/**
 * Defineix les propietats estàndard que reben
 * els components de pàgina (page.tsx) a Next.js (App Router).
 */
export type PageProps = {
  /**
   * Paràmetres de ruta dinàmica.
   * Per a una ruta /product/[id], 'params' seria { id: '...' }
   */
  params: { [key: string]: string };

  /**
   * Paràmetres de cerca de la URL (query string).
   * Per a una ruta /products?q=test&page=2,
   * 'searchParams' seria { q: 'test', page: '2' }
   */
  searchParams: { [key: string]: string | string[] | undefined };
};