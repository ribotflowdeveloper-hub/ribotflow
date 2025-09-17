/**
 * @file src/types/crm/general.ts
 * @summary Defineix tipus de dades generals per al CRM com Productes i Perfil d'Empresa.
 */

export type Product = { 
    id: number; 
    name: string; 
    description?: string | null; 
    price: number; 
    iva?: number | null;
    discount?: number | null;
    category?: string | null;
    unit?: string | null;
    is_active?: boolean;
  };
  
  export type CompanyProfileObject = { 
    id: string; 
    user_id: string; 
    company_name?: string | null; 
    company_tax_id?: string | null; 
    company_address?: string | null; 
    company_email?: string | null; 
    company_phone?: string | null; 
    logo_url?: string | null; 
  };
  
  export type CompanyProfile = CompanyProfileObject | null;