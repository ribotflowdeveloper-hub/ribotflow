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

/**
 * Representa les dades públiques d'un projecte (per al popup de detall).
 */
export interface PublicJobPostingDetail extends JobPostingListItem {
    description: string | null;
    required_skills: string[] | null;
    budget: number | null;
}

// --- ✅ NOUS TIPUS AFEGITS PER AL MAPA ---

/**
 * Dades d'un equip (perfil) optimitzades per als marcadors del mapa.
 * (Basat en el SELECT de getAllNetworkTeams)
 */
export type MapTeam = {
  id: string;
  name: string;
  logo_url: string | null;
  latitude: number; // Filtrat per no ser null al servei
  longitude: number; // Filtrat per no ser null al servei
  services: string[]; // Assegurat com a array pel servei
  city: string | null;
  country: string | null;
};

/**
 * Dades d'un projecte (job) optimitzades per als marcadors del mapa.
 * (Basat en el SELECT de getAllNetworkJobPostings)
 */
export type MapJobPosting = {
  id: string;
  title: string;
  latitude: number; // Filtrat per no ser null al servei
  longitude: number; // Filtrat per no ser null al servei
  budget: number | null;
  team_id: string;
  teams: { // Objecte de l'equip (no un array)
    name: string | null;
    logo_url: string | null;
  } | null;
};

/**
 * Objecte de dades wrapper que conté tota la informació
 * necessària per renderitzar el mapa inicial.
 */
export type MapData = {
  teams: MapTeam[];
  jobs: MapJobPosting[];
};