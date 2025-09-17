// types/network.ts
export interface PublicProfile {
  id: string;
  full_name: string | null; // ✅ AFEGIT: Camp que faltava
  company_name: string;
  logo_url: string | null;
  summary: string | null;
  services: string[] | null;
  website_url: string | null;
  latitude: number;
  longitude: number;
}