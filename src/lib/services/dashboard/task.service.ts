import { type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { DbTableInsert } from '@/types/db'

/**
 * Crea una nova tasca a la base de dades.
 * Afegeix automàticament una referència a la feina d'àudio (jobId) si es proporciona.
 */
export async function createTaskFromTranscriptionData(
  supabase: SupabaseClient<Database>,
  taskData: DbTableInsert<'tasks'>,
  jobId: string
) {
  // Enriquim la descripció amb el context de la transcripció
  const finalDescription =
    (taskData.description || '') +
    `\n\n---
     Tasca creada a partir de la transcripció: ${jobId}`

  const taskToInsert: DbTableInsert<'tasks'> = {
    ...taskData,
    description: finalDescription,
    // Assegurem valors per defecte si no venen
    is_completed: false,
    priority: taskData.priority || 'Mitjana',
  }

  try {
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(taskToInsert)
      
    if (insertError) {
      throw new Error(insertError.message)
    }
    
    return { success: true }
  } catch (error: unknown) {
    const message = (error as Error).message
    console.error(`[task.service] Error creant tasca: ${message}`)
    throw new Error(`No s'ha pogut crear la tasca: ${message}`)
  }
}