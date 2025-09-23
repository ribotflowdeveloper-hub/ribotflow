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

// Pots afegir aquí altres tipus compartits com Quote, Invoice, etc.