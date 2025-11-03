// src/lib/services/comunicacio/transcripcio.service.ts
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { DbTableInsert, AudioJob, AudioJobStatus } from '@/types/db';

// ... (Tipus CreateAudioJobArgs es manté igual) ...
export interface CreateAudioJobArgs {
  storagePath: string
  participants: ParticipantInput[]
  projectId?: string | null
}
type ParticipantInput = {
  contact_id: number
  name: string
  role: string
}

/**
 * SERVEI: Crea una nova feina (job) a la taula 'audio_jobs'.
 * Llança un error si falla.
 */
export async function createAudioJob(
    supabase: SupabaseClient<Database>,
    args: CreateAudioJobArgs,
    userId: string,
    teamId: string
// ✅ CANVI: La feina retorna un 'string' (el UUID), no un 'number'.
): Promise<string> { 
  const { storagePath, participants, projectId } = args;

  const dataToInsert: DbTableInsert<'audio_jobs'> = {
    team_id: teamId,
    user_id: userId,
    project_id: projectId || null,
    storage_path: storagePath,
    participants: participants as ParticipantInput[], 
    status: 'pending' as AudioJobStatus,
  };

  const { data: newJob, error } = await supabase
    .from('audio_jobs')
    .insert(dataToInsert)
    .select('id')
    .single();

  if (error) {
    console.error('Error creant audio_job (service):', error.message);
    throw new Error("No s'ha pogut crear la feina d'àudio.");
  }

  // ✅ CANVI: Retornem l'ID directament. És un string (uuid).
  // ❌ NO FACIS: return Number(newJob.id);
  return newJob.id;
}

/**
 * SERVEI: Obté els detalls d'una feina d'àudio específica.
 * Llança un error si falla.
 */
export async function getAudioJobDetails(
    supabase: SupabaseClient<Database>,
    jobId: string,
    teamId: string
): Promise<AudioJob> {
  const { data: job, error } = await supabase
    .from('audio_jobs')
    .select('*')
    .eq('id', jobId) // <--- Ara 'jobId' serà un UUID string vàlid
    .eq('team_id', teamId) 
    .single();

  if (error) {
    // Aquesta línia és on es mostrava l'error que has vist
    console.error('Error fetching audio job (service):', error.message); 
    throw new Error("No s'ha trobat la feina d'àudio.");
  }

  return job as AudioJob;
}

/**
 * SERVEI: Obté totes les feines d'àudio per a l'equip.
 * Llança un error si falla.
 */
export async function getTeamAudioJobs(
    supabase: SupabaseClient<Database>,
    teamId: string
): Promise<Pick<AudioJob, 'id' | 'created_at' | 'status' | 'summary' | 'error_message'>[]> {
  const { data: jobs, error } = await supabase
    .from('audio_jobs')
    .select('id, created_at, status, summary, error_message')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audio jobs (service):', error.message);
    throw new Error("No s'han pogut carregar les feines.");
  }
  
  return jobs || [];
}

/**
 * ✅ NOU SERVEI: Esborra una feina d'àudio i el seu arxiu a l'storage.
 * Llança un error si falla.
 */
export async function deleteAudioJob(
     supabase: SupabaseClient<Database>,
     jobId: string,
     teamId: string,
    storagePath: string
): Promise<void> {
    // 1. Esborrar la fila de la taula 'audio_jobs'
    const { error: dbError } = await supabase
        .from('audio_jobs')
        .delete()
        .eq('id', jobId)
        .eq('team_id', teamId);

    if (dbError) {
        console.error('Error esborrant feina (service):', dbError.message);
        throw new Error("No s'ha pogut esborrar la transcripció.");
    }

    // 2. Esborrar l'arxiu de l'storage
    const { error: storageError } = await supabase.storage
        .from('audio-uploads')
        .remove([storagePath]);

    if (storageError) {
        // No llancem error, només ho registrem. La feina ja està esborrada.
        console.warn(`Error esborrant arxiu de l'storage (${storagePath}):`, storageError.message);
    }
}

/**
 * ✅ NOU SERVEI: Obté els emails dels contactes participants.
 * Llança un error si falla.
 */
export async function getParticipantEmails(
     supabase: SupabaseClient<Database>,
    contactIds: number[],
    teamId: string
): Promise<string[]> {
    if (contactIds.length === 0) return [];

    const { data, error } = await supabase
        .from('contacts')
        .select('email')
        .in('id', contactIds)
        .eq('team_id', teamId)
        .not('email', 'is', null); // Assegurem que l'email no sigui nul

    if (error) {
        console.error('Error obtenint emails participants (service):', error.message);
        throw new Error("No s'han pogut obtenir els emails dels destinataris.");
    }
    
    // Filtrem per assegurar que només retornem emails vàlids
    return data.map(c => c.email).filter((email): email is string => !!email);
}