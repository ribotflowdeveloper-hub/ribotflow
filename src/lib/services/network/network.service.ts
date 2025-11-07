"use server";

import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  PublicProfileDetail,
  PublicJobPostingDetail,
  MapTeam,
  MapJobPosting
} from '@/app/[locale]/(app)/network/types';
import type { CreateJobPostingData } from '@/app/[locale]/(app)/network/schemas';

// --- FUNCIONS PER AL MAPA (AMB ADMIN) ---
// (Aquestes dues funcions ja estaven correctes)

export async function getAllNetworkTeams(): Promise<MapTeam[]> {
  console.log("[NetworkService] Iniciant getAllNetworkTeams (AMB ADMIN)...");
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('teams')
    .select(`
      id,
      name,
      logo_url,
      latitude,
      longitude,
      services,
      city,
      country
    `)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error("Error getAllNetworkTeams (service):", error);
    return [];
  }

  return data.map(team => ({
    ...team,
    services: Array.isArray(team.services) ? team.services as string[] : (team.services ? [team.services as string] : [])
  }));
}

export async function getAllNetworkJobPostings(): Promise<MapJobPosting[]> {
  console.log("[NetworkService] Iniciant getAllNetworkJobPostings (AMB ADMIN)...");
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('job_postings')
    .select(`
      id,
      title,
      latitude,
      longitude,
      budget,
      team_id,
      teams ( name, logo_url )
    `)
    .eq('status', 'open')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error("Error getAllNetworkJobPostings (service):", error);
    return [];
  }

  return data.map(job => {
    const teamData = Array.isArray(job.teams) ? job.teams[0] : job.teams;
    return {
      ...job,
      teams: teamData ? { name: teamData.name, logo_url: teamData.logo_url } : null
    };
  }) as MapJobPosting[];
}


// --- FUNCIONS DE DETALL (PÚBLIQUES AMB ADMIN) ---

/**
 * Obté els detalls PÚBLICS d'un equip.
 * ANOMENADA per getPublicTeamDetailsAction
 */
export async function getPublicTeamDetails(
  teamId: string
): Promise<PublicProfileDetail> {
  console.log(`[NetworkService] Iniciant getPublicTeamDetails (AMB ADMIN) per a l'equip: ${teamId}`);
  const supabaseAdmin = createAdminClient();

  // ✅ CORRECCIÓ: Select alineat amb el teu JSON de la BBDD.
  // Canviem 'description' per 'summary', 'website_url' per 'website',
  // i afegim 'phone' i 'email'. Traiem 'team_type'.
  const { data: teamData, error: teamError } = await supabaseAdmin
    .from('teams')
    .select(`
      id, name, logo_url, services, city, country, latitude, longitude,
      owner_id,
      summary, 
      website, 
      sector,
      phone,
      email
    `)
    .eq('id', teamId)
    .single();

  if (teamError || !teamData) {
    console.error(`[NetworkService] Error getPublicTeamDetails (ADMIN):`, teamError);
    throw new Error("No s'ha pogut trobar l'equip especificat.");
  }

  let ownerData = null;
  if (teamData.owner_id) {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', teamData.owner_id)
      .single();

    if (profileError) {
      console.warn(`No s'ha trobat el perfil per a l'owner_id ${teamData.owner_id}:`, profileError.message);
    } else {
      ownerData = { full_name: profileData.full_name };
    }
  }

  // ✅ CORRECCIÓ CLAU: Construïm l'objecte manualment per satisfer el tipus
  // 'PublicProfileDetail', fent el mapeig correcte.
  const detailedProfile: PublicProfileDetail = {
    // Camps de PublicProfileListItem
    id: teamData.id,
    name: teamData.name,
    logo_url: teamData.logo_url,
    latitude: teamData.latitude,
    longitude: teamData.longitude,
    sector: teamData.sector ?? null, // <-- Columna 'sector'

    // Camps de PublicProfileDetail
    services: Array.isArray(teamData.services)
      ? teamData.services as string[]
      : typeof teamData.services === 'string'
        ? [teamData.services]
        : null,
    owner: ownerData,
    summary: teamData.summary ?? null, // <-- Columna 'summary'
    website: teamData.website ?? null, // <-- Columna 'website'
    address: teamData.city ?? null, // <-- Mapegem 'city' a 'address'
    phone: teamData.phone ?? null, // <-- Columna 'phone'
    email: teamData.email ?? null, // <-- Columna 'email'
  };

  return detailedProfile;
}

/**
 * Obté els detalls PÚBLICS d'un projecte.
 * (Aquesta funció estava correcta)
 */
export async function getPublicJobPostingDetails(
  jobId: string
): Promise<PublicJobPostingDetail> {
  console.log(`[NetworkService] Iniciant getPublicJobPostingDetails (AMB ADMIN) per al projecte: ${jobId}`);
  const supabaseAdmin = createAdminClient();

  const { data: jobData, error: jobError } = await supabaseAdmin
    .from('job_postings')
    .select(`
      id, title, description, budget, team_id, latitude, longitude,
      status, created_at,
      required_skills,
      address_text,
      teams ( name, logo_url )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !jobData) {
    console.error("Error getPublicJobPostingDetails (ADMIN):", jobError);
    throw new Error("No s'ha pogut trobar el projecte especificat.");
  }

  const teamData = Array.isArray(jobData.teams) ? jobData.teams[0] : jobData.teams;

  return {
    ...jobData,
    teams: teamData ? { name: teamData.name, logo_url: teamData.logo_url } : null
  } as PublicJobPostingDetail;
}


// --- FUNCIONS PRIVADES (UTILITZEN RLS) ---

/**
 * Obté els detalls d'un equip (PRIVAT, AMB RLS).
 * Crida des de getTeamDetailsAction.
 */
export async function getTeamDetails(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<PublicProfileDetail> {
  console.log(`[NetworkService] Iniciant getTeamDetails (AMB RLS) per a l'equip: ${teamId}`);
  
  // ✅ CORRECCIÓ: Mateix 'select' que a la funció pública.
  // RLS s'encarregarà de filtrar si l'usuari pot veure
  // les dades sensibles (com 'phone' o 'email') si ho has configurat.
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select(`
      id, name, logo_url, services, city, country, latitude, longitude,
      owner_id,
      summary, 
      website, 
      sector,
      phone,
      email
    `)
    .eq('id', teamId)
    .single();

  if (teamError || !teamData) {
    console.error(`[NetworkService] Error getTeamDetails (RLS):`, teamError);
    throw new Error("No s'ha pogut trobar l'equip especificat o no tens permisos.");
  }

  let ownerData = null;
  if (teamData.owner_id) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', teamData.owner_id)
      .single();
    if (profileError) {
      console.warn(`No s'ha trobat el perfil per a l'owner_id ${teamData.owner_id}:`, profileError.message);
    } else {
      ownerData = { full_name: profileData.full_name };
    }
  }

  // ✅ CORRECCIÓ CLAU: Construïm l'objecte manualment, igual que a la funció pública.
  const detailedProfile: PublicProfileDetail = {
    // Camps de PublicProfileListItem
    id: teamData.id,
    name: teamData.name,
    logo_url: teamData.logo_url,
    latitude: teamData.latitude,
    longitude: teamData.longitude,
    sector: teamData.sector ?? null,

    // Camps de PublicProfileDetail
    services: Array.isArray(teamData.services) ? teamData.services as string[] : (typeof teamData.services === 'string' ? [teamData.services] : null),
    owner: ownerData,
    summary: teamData.summary ?? null,
    website: teamData.website ?? null,
    address: teamData.city ?? null,
    phone: teamData.phone ?? null,
    email: teamData.email ?? null,
  };

  return detailedProfile;
}

/**
 * Obté els detalls d'un projecte (PRIVAT, AMB RLS).
 * (Aquesta funció estava correcta)
 */
export async function getJobPostingDetails(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<PublicJobPostingDetail> {
  console.log(`[NetworkService] Iniciant getJobPostingDetails (AMB RLS) per al projecte: ${jobId}`);
  
  const { data: jobData, error: jobError } = await supabase
    .from('job_postings')
    .select(`
      id, title, description, budget, team_id, latitude, longitude,
      status, created_at,
      required_skills,
      address_text,
      teams ( name, logo_url )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !jobData) {
    console.error("Error getJobPostingDetails (RLS):", jobError);
    throw new Error("No s'ha pogut trobar el projecte especificat o no tens permisos.");
  }
  
  const teamData = Array.isArray(jobData.teams) ? jobData.teams[0] : jobData.teams;

  return {
    ...jobData,
    teams: teamData ? { name: teamData.name, logo_url: teamData.logo_url } : null
  } as PublicJobPostingDetail;
}


/**
 * Crea un projecte (PRIVAT, AMB RLS).
 * (Aquesta funció ja estava correcta)
 */
export async function createJobPosting(
  supabase: SupabaseClient<Database>,
  validatedData: CreateJobPostingData
) {
  console.log(`[NetworkService] Iniciant createJobPosting (AMB RLS)...`);
  const { data, error } = await supabase
    .from('job_postings')
    .insert(validatedData)
    .select()
    .single();

  if (error) {
    console.error("Error d'inserció a Supabase (service):", error.message);
    throw new Error("No s'ha pogut publicar el projecte. Assegura't que tens permisos.");
  }

  return data;
}