/**
 * @file types.ts (Network)
 * @summary Fichero centralizado para las definiciones de tipos del módulo de Network.
 */

export type PublicProfile = {
    id: string;
    full_name: string | null;
    company_name: string | null;
    summary: string | null;
    services: string[] | null;
    logo_url: string | null;
    website_url: string | null;
    latitude: number;
    longitude: number;
  };