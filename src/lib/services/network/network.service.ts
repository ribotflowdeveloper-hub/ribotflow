// src/lib/services/network/network.service.ts (FITXER NOU)
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { PublicProfileDetail, PublicJobPostingDetail } from '@/app/[locale]/(app)/network/types'; // Importem els tipus de vista
import type { CreateJobPostingData } from '@/app/[locale]/(app)/network/schemas'; // Importem el tipus del schema

/**
 * SERVEI: Obté les dades detallades d'un sol equip (perfil professional).
 */
export async function getTeamDetails(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<PublicProfileDetail> {
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (teamError || !teamData) {
    throw new Error("No s'ha pogut trobar l'equip especificat.");
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

/**
 * SERVEI: Obté les dades detallades d'un sol projecte (job_posting).
 */
export async function getJobPostingDetails(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<PublicJobPostingDetail> {
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

/**
 * SERVEI: Crea un nou 'job_posting'.
 */
export async function createJobPosting(
  supabase: SupabaseClient<Database>,
  validatedData: CreateJobPostingData // Rep les dades ja validades
) {
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