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