'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import type { DbTableInsert } from '@/types/db'
import type { ActionResult } from '@/types/shared/actionResult'

// Imports de Seguretat
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage,
} from '@/lib/permissions/permissions'

// Serveis
import * as transcripcioService from '@/lib/services/comunicacio/transcripcio.service'
import * as taskService from '@/lib/services/dashboard/task.service' // <-- NOU SERVEI
import * as transcripcioEmailService from '@/lib/services/comunicacio/transcripcioEmail.service' // <-- NOU SERVEI
import type { CreateAudioJobArgs } from '@/lib/services/comunicacio/transcripcio.service'

/*
 * NOTA: La funció 'logAIAction' s'ha eliminat.
 * Aquesta lògica hauria de moure's a 'transcripcio.service.ts'
 * i ser cridada internament per 'createAudioJob' per assegurar
 * que el log es fa de manera transaccional amb la creació de la feina.
 */

/* =============================================
 * ACCIONS CRUD (Ja estaven correctes)
 * ============================================= */

export async function createAudioJob(args: CreateAudioJobArgs) {
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_TRANSLATIONS,
    'maxAIActionsPerMonth'
  )
  if ('error' in validation) {
    return { error: validation.error.message }
  }
  const { supabase, user, activeTeamId } = validation

  try {
    const jobId = await transcripcioService.createAudioJob(
      supabase,
      args,
      user.id,
      activeTeamId
      // El servei 'createAudioJob' ara hauria de ser responsable
      // de cridar 'logAIAction' internament.
    )

    revalidatePath('/[locale]/(app)/comunicacio/transcripcio', 'layout')
    return { success: true, jobId: jobId }
  } catch (error: unknown) {
    const message = (error as Error).message
    console.error('Error creant audio_job (action):', message)
    return { error: message }
  }
}

export async function getAudioJobDetails(jobId: string) {
  const session = await validateSessionAndPermission(
    PERMISSIONS.VIEW_TRANSLATIONS
  )
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  try {
    const job = await transcripcioService.getAudioJobDetails(
      supabase,
      jobId,
      activeTeamId
    )
    return { data: job }
  } catch (error: unknown) {
    const message = (error as Error).message
    return { error: message }
  }
}

export async function getTeamAudioJobs() {
  const session = await validateSessionAndPermission(
    PERMISSIONS.VIEW_TRANSLATIONS
  )
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  try {
    const jobs = await transcripcioService.getTeamAudioJobs(
      supabase,
      activeTeamId
    )
    return { data: jobs }
  } catch (error: unknown) {
    const message = (error as Error).message
    return { error: message }
  }
}

export async function deleteAudioJobAction(formData: FormData) {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TRANSLATIONS
  )
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  const deleteJobSchema = z.object({
    jobId: z.string().uuid(),
    storagePath: z.string().min(1),
    locale: z.string().min(2),
  })

  const parseResult = deleteJobSchema.safeParse({
    jobId: formData.get('jobId'),
    storagePath: formData.get('storagePath'),
    locale: formData.get('locale'),
  })

  if (!parseResult.success) {
    return { error: 'Dades invàlides.' }
  }
  const { jobId, storagePath, locale } = parseResult.data

  try {
    await transcripcioService.deleteAudioJob(
      supabase,
      jobId,
      activeTeamId,
      storagePath
    )
  } catch (error: unknown) {
    return { error: (error as Error).message }
  }

  revalidatePath('/[locale]/(app)/comunicacio/transcripcio', 'layout')
  redirect(`/${locale}/comunicacio/transcripcio`)
}

/* =============================================
 * ACCIONS DE LÒGICA DE NEGOCI (Refactoritzades)
 * ============================================= */

const createTaskSchema = z.object({
  title: z.string().min(3, 'El títol ha de tenir almenys 3 caràcters.'),
  description: z.string().optional().nullable(),
  contact_id: z.number().nullable(),
  project_id: z.string().uuid().nullable(),
  job_id: z.string().uuid(),
})

export async function createTaskFromTranscription(formData: FormData) {
  // 1. Validar Sessió
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_TASKS)
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, user, activeTeamId } = session

  // 2. Parsejar Dades
  const parseResult = createTaskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    contact_id: formData.get('contact_id')
      ? Number(formData.get('contact_id'))
      : null,
    project_id: formData.get('project_id') || null,
    job_id: formData.get('job_id'),
  })

  if (!parseResult.success) {
    return { error: 'Dades invàlides.', details: parseResult.error.flatten() }
  }

  // 3. Preparar dades per al servei
  const { title, description, contact_id, job_id } = parseResult.data
  const taskToInsert: DbTableInsert<'tasks'> = {
    team_id: activeTeamId,
    user_id: user.id,
    title,
    description: description || null,
    contact_id: contact_id || null,

    // La resta de camps (priority, is_completed) els posarà el servei
  }

  try {
    // 4. Delegar al Servei de Tasques
    await taskService.createTaskFromTranscriptionData(
      supabase,
      taskToInsert,
      job_id
    )

    // 5. Gestionar efectes secundaris
    revalidatePath('/[locale]/(app)/crm/activitats')
    revalidatePath(`/[locale]/(app)/comunicacio/transcripcio/${job_id}`)
    return { success: true }
  } catch (error: unknown) {
    const message = (error as Error).message
    return { error: message } // El servei ja hauria formatat el missatge
  }
}

const sendEmailSchema = z.object({
  jobId: z.string().uuid(),
})

export async function sendTranscriptionSummaryEmailAction(
  formData: FormData
): Promise<ActionResult> {
  // 1. Validar Sessió
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TRANSLATIONS
  )
  if ('error' in validation) {
    // ✅ Aquest ja retorna correctament { error: ... }
    return {success: false,  error: validation.error.message }
  }
  const { supabase, activeTeamId, user } = validation

  // 2. Carregar Traduccions
  const t = await getTranslations('Transcripcio')

  // 3. Validar dades del formulari
  const parseResult = sendEmailSchema.safeParse({ jobId: formData.get('jobId') })
  if (!parseResult.success)
    // ✅ Aquest també retorna un format d'error que el client potser no gestiona,
    // però el teu 'handleSendEmail' només busca 'result.error'.
    // Per coherència, ho canviem també:
    return {success: false,  error: t('sendEmailInvalidData') }

  const { jobId } = parseResult.data

  try {
    // 4. Delegar al Servei d'Email
    const result = await transcripcioEmailService.sendTranscriptionSummaryEmail(
      supabase,
      user,
      activeTeamId,
      jobId,
      t as (key: string) => string
    )
    
    // Si el servei té èxit, retorna { success: true, ... }
    return result 
  
  } catch (error: unknown) {
    // ⚠️ AQUEST ÉS EL PUNT CRÍTIC DE LA CORRECCIÓ
    const message = (error as Error).message
    console.error('Error enviant email de resum (action):', message)
    
    // ABANS (Incorrecte per al teu client):
    // return { success: false, message: message } 
    
    // ARA (Correcte per al teu client):
    // Retornem un objecte que SÍ té la propietat 'error',
    // perquè el 'if (result?.error)' del client funcioni.
    return {  success: false, error: message }
  }
}