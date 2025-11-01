// /app/[locale]/network/types.ts

/**
 * Representa les dades MÍNIMES d'una empresa (team) que es mostren a la llista inicial.
 */
export type PublicProfileListItem = {
    id: string;
    name: string;
    sector: string | null;
    logo_url: string | null;
    latitude: number | null;
    longitude: number | null;
};

/**
 * Representa les dades COMPLETES d'una empresa, incloent el nom del propietari.
 * Aquestes dades es carreguen quan l'usuari fa clic.
 */
export type PublicProfileDetail = PublicProfileListItem & {
    summary: string | null;
    services: string[] | null;
    website: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    owner: {
        full_name: string | null;
    } | null;
};

// --- NOVES ADDICIONS ---

/**
 * Representa les dades d'un projecte (job_posting) tal com es reben
 * del servidor, incloent la informació bàsica de l'equip que el publica.
 */
export type JobPostingListItem = {
    id: string;
    title: string;
    latitude: number | null;
    longitude: number | null;
    address_text: string | null;
    team_id: string;
    // Dades de l'equip obtingudes mitjançant JOIN
    teams: {
        name: string | null;
        logo_url: string | null;
    } | null;
};

/**
 * Representa les dades completes d'un projecte quan es demanen
 * individualment (per exemple, en un Popup o Dialog).
 */
export type JobPostingDetail = JobPostingListItem & {
    created_at: string;
    description: string | null;
    required_skills: string[] | null;
    budget: number | null;
    expires_at: string | null;
};

// ✅ NOU TIPUS: Afegeix els detalls que falten per al popup
export interface PublicJobPostingDetail extends JobPostingListItem {
    description: string | null;
    required_skills: string[] | null;
    budget: number | null;
}