'use server'

import { revalidatePath } from 'next/cache'
import { validateUserSession } from '@/lib/supabase/session' // ✅ El teu helper
// ✅ Definim el tipus que retornarem, basat en la taula real

// Tipus per als participants que rebem del client
type ParticipantInput = {
  contact_id: number
  name: string
  role: string
}



// Tipus per als arguments de la creació de la feina
interface CreateAudioJobArgs {
  storagePath: string
  participants: ParticipantInput[]
  projectId?: string | null
}

/**
 * Crea una nova feina (job) a la taula 'audio_jobs'.
 * Només la posa a la cua (status: 'pending').
 */
export async function createAudioJob(args: CreateAudioJobArgs) {
  const { storagePath, participants, projectId } = args
  
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }

  const { supabase, user, activeTeamId } = session

  // 2. Inserir la nova feina a la cua
  const { data: newJob, error } = await supabase
    .from('audio_jobs')
    .insert({
      team_id: activeTeamId,
      user_id: user.id,
      project_id: projectId || null,
      storage_path: storagePath,
      participants: participants as ParticipantInput[], // Supabase client espera Json
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creant audio_job:', error.message)
    return { error: 'No s\'ha pogut crear la feina d\'àudio.' }
  }

  // 3. Invalidar la memòria cau de la pàgina on es veuran els resultats
  revalidatePath('/[locale]/(app)/comunicacio/transcripcio')

  return { success: true, jobId: newJob.id }
}



/**
 * Obté els detalls d'una feina d'àudio específica.
 */
export async function getAudioJobDetails(jobId: string) {
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }

  const { supabase, activeTeamId } = session

  const { data: job, error } = await supabase
    .from('audio_jobs')
    .select('*') // Podem seleccionar tot o només el que necessitem
    .eq('id', jobId)
    .eq('team_id', activeTeamId) // RLS ja ho faria, però és bona pràctica
    .single()

  if (error) {
    console.error('Error fetching audio job:', error.message)
    return { error: 'No s\'ha trobat la feina d\'àudio.' }
  }

  return { data: job }
}

/**
 * Obté totes les feines d'àudio (noves i velles) per a l'equip actiu.
 */
export async function getTeamAudioJobs() {
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  const { data: jobs, error } = await supabase
    .from('audio_jobs')
    .select('id, created_at, status, summary, error_message') // No cal el text sencer
    .eq('team_id', activeTeamId)
    .order('created_at', { ascending: false }) // Les més noves primer

  if (error) {
    console.error('Error fetching audio jobs:', error.message)
    return { error: 'No s\'han pogut carregar les feines.' }
  }
  
  return { data: jobs }
}