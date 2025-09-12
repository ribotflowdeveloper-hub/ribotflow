// types/index.ts
export interface PublicProfile {
    id: string;
    company_name: string;
    logo_url: string | null;
    summary: string | null;
    services: string[] | null;
    website_url: string | null;
    latitude: number;
    longitude: number;
  }