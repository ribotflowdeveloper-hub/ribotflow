import { Profile } from "./profiles";

/**
 * Representa les dades d'una EMPRESA o EQUIP.
 * Aquesta informació es mostra a factures, pressupostos, etc.
 */
export type Team = {
    id: string; // UUID de l'equip
    name: string; // Nom de l'empresa
    owner_id: string; // Qui és el propietari
    
    // Dades de contacte i fiscals
    tax_id: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;

    // Dades descriptives
    summary: string | null;
    sector: string | null;
    services: string[] | null; // Guardat com a JSONB a la base de dades

    // Dades d'adreça estructurada (si les tens separades)
    street?: string | null;
    city?: string | null;
    postal_code?: string | null;
    region?: string | null;
    country?: string | null;
    
    // Geolocalització
    latitude: number | null;
    longitude: number | null;
};

/**
 * Representa la relació entre un usuari i un equip.
 * Aquest tipus s'utilitza quan carreguem la llista de membres.
 */
export type TeamMember = {
    role: 'owner' | 'admin' | 'member';
    // Quan fem una consulta, podem incloure el perfil complet de l'usuari
    profiles: Pick<Profile, 'id' | 'full_name'> & { email: string | null };
};

/**
 * Representa una invitació pendent.
 */
export type Invitation = {
    id: string;
    email: string;
    role: string;
};

// Aquest tipus representa les dades tal com venen de la taula 'teams' de Supabase
export type TeamData = {
    id: string;
    name: string | null;
    tax_id: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    // afegeix altres camps de la taula 'teams' que necessitis
};

// Aquest tipus representa les dades tal com les esperen els components de React.
// És el format que volem obtenir DESPRÉS de mapejar les dades de 'teams'.
export type CompanyProfile = {
    id: string;
    user_id?: string; // El fem opcional per si no sempre hi és
    company_name: string | null;
    company_tax_id: string | null;
    company_address: string | null;
    company_email: string | null;
    company_phone: string | null;
    logo_url: string | null;
};