// src/lib/services/network/network.service.ts
"use server";

import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { createAdminClient } from '@/lib/supabase/admin'; 
import type { PublicProfileDetail, PublicJobPostingDetail, MapTeam, MapJobPosting } from '@/app/[locale]/(app)/network/types'; 
import type { CreateJobPostingData } from '@/app/[locale]/(app)/network/schemas';

// --- FUNCIONS PER AL MAPA (AMB ADMIN) ---

export async function getAllNetworkTeams(): Promise<MapTeam[]> {
  console.log("[NetworkService] Iniciant getAllNetworkTeams (AMB ADMIN)...");
  const supabaseAdmin = createAdminClient(); 
  
  const { data, error, count } = await supabaseAdmin
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
    `, { count: 'exact' }) // Demanem el recompte
    // 👇 CORRECCIÓ: Canviat .neq() per .not('...', 'is', null)
    .not('latitude', 'is', null) 
    .not('longitude', 'is', null);

  if (error) {
    console.error("Error getAllNetworkTeams (service):", error);
    return [];
  }
  
  console.log(`[NetworkService] Equips trobats (AMB ADMIN): ${data.length} (Recompte total: ${count})`);
  
  return data.map(team => ({
    ...team,
    services: Array.isArray(team.services) ? team.services as string[] : (team.services ? [team.services as string] : [])
  }));
}

export async function getAllNetworkJobPostings(): Promise<MapJobPosting[]> {
  console.log("[NetworkService] Iniciant getAllNetworkJobPostings (AMB ADMIN)...");
  const supabaseAdmin = createAdminClient();
  
  const { data, error, count } = await supabaseAdmin
    .from('job_postings')
    .select(`
      id,
      title,
      latitude,
      longitude,
      budget,
      team_id,
      teams ( name, logo_url ) 
    `, { count: 'exact' }) // Demanem el recompte
    .eq('status', 'open') 
    // 👇 CORRECCIÓ: Canviat .neq() per .not('...', 'is', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error("Error getAllNetworkJobPostings (service):", error);
    return [];
  }

  console.log(`[NetworkService] Projectes trobats (AMB ADMIN): ${data.length} (Recompte total: ${count})`);

  return data.map(job => {
    const teamData = Array.isArray(job.teams) ? job.teams[0] : job.teams;
    return {
      ...job,
      teams: teamData ? { name: teamData.name, logo_url: teamData.logo_url } : null
    };
  }) as MapJobPosting[];
}


// --- FUNCIONS EXISTENTS (UTILITZEN RLS) ---
// (La resta del fitxer és correcte i no necessita canvis)

export async function getTeamDetails(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<PublicProfileDetail> {
  console.log(`[NetworkService] Iniciant getTeamDetails (AMB RLS) per a l'equip: ${teamId}`);
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('*') 
    .eq('id', teamId)
    .single();

  if (teamError || !teamData) {
    console.error(`[NetworkService] Error getTeamDetails (RLS):`, teamError);
    throw new Error("No s'ha pogut trobar l'equip especificat.");
  }

  // ... (resta de la funció idèntica)
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

  const detailedProfile: PublicProfileDetail = {
    ...teamData,
    services: Array.isArray(teamData.services)
      ? teamData.services as string[]
      : typeof teamData.services === 'string'
        ? [teamData.services]
        : null,
    owner: ownerData,
  };

  return detailedProfile;
}

export async function getJobPostingDetails(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<PublicJobPostingDetail> {
  console.log(`[NetworkService] Iniciant getJobPostingDetails (AMB RLS) per al projecte: ${jobId}`);
  const { data: jobData, error: jobError } = await supabase
    .from('job_postings')
    .select(`
      *,
      teams (
        name,
        logo_url
      )
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !jobData) {
    console.error("Error getJobPostingDetails (service):", jobError);
    throw new Error("No s'ha pogut trobar el projecte especificat.");
  }
  
  return jobData as PublicJobPostingDetail;
}

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