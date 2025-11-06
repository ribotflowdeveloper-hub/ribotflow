// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/actions.ts
'use server'

import { type SupabaseClient } from '@supabase/supabase-js'
import type { DbTableInsert, AudioJob } from '@/types/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Base64 } from 'js-base64'

// Imports de Seguretat
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage,
} from '@/lib/permissions/permissions' // Ajustat el path si cal
import { createAdminClient as createSupabaseAdminClient } from '@/lib/supabase/admin'

// Serveis
import * as transcripcioService from '@/lib/services/comunicacio/transcripcio.service'
import type { CreateAudioJobArgs } from '@/lib/services/comunicacio/transcripcio.service'
import type { ActionResult } from '@/types/shared/actionResult'
import { decryptToken } from '@/lib/utils/crypto' // Ajustat el path si cal
import { type Database } from '@/types/supabase'

/* Accions existents (createAudioJob, getAudioJobDetails, etc.)
  Aquestes accions són correctes i es mantenen igual.
*/
async function logAIAction(teamId: string, userId: string, actionType: string) {
  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { error } = await supabaseAdmin
      .from('ai_usage_log')
      .insert({ team_id: teamId, user_id: userId, action_type: actionType })
    if (error) throw error
  } catch (err) {
    console.error(
      `[logAIAction] No s'ha pogut registrar l'ús d'IA:`,
      (err as Error).message
    )
  }
}
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
    )
    await logAIAction(activeTeamId, user.id, 'create_transcription')
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
const createTaskSchema = z.object({
  title: z.string().min(3, 'El títol ha de tenir almenys 3 caràcters.'),
  description: z.string().optional().nullable(),
  contact_id: z.number().nullable(),
  project_id: z.string().uuid().nullable(),
  job_id: z.string().uuid(),
})
export async function createTaskFromTranscription(formData: FormData) {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_TASKS)
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, user, activeTeamId } = session
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
  const { title, description, contact_id, job_id } = parseResult.data
  const taskToInsert: DbTableInsert<'tasks'> = {
    team_id: activeTeamId,
    user_id: user.id,
    title,
    description: description || null,
    contact_id: contact_id || null,
    is_completed: false,
    priority: 'Mitjana',
  }
  const finalDescription =
    (description || '') +
    `\n\n---
      Tasca creada a partir de la transcripció: ${job_id}`
  taskToInsert.description = finalDescription
  try {
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(taskToInsert)
    if (insertError) {
      throw new Error(insertError.message)
    }
    revalidatePath('/[locale]/(app)/crm/activitats')
    revalidatePath(`/[locale]/(app)/comunicacio/transcripcio/${job_id}`)
    return { success: true }
  } catch (error: unknown) {
    const message = (error as Error).message
    return { error: `No s'ha pogut crear la tasca: ${message}` }
  }
}
const deleteJobSchema = z.object({
  jobId: z.string().uuid(),
  storagePath: z.string().min(1),
  locale: z.string().min(2),
})
export async function deleteAudioJobAction(formData: FormData) {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TRANSLATIONS
  )
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session
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

// --- ✅ SECCIÓ D'ENVIAMENT D'EMAIL (LÒGICA CONFIRMADA) ---

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

/**
 * HELPER 1: Autenticació de Google (Correcte)
 */
async function getGoogleAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ accessToken: string; userEmail: string }> {
  if (!process.env.ENCRYPTION_SECRET_KEY) {
    throw new Error('Falta ENCRYPTION_SECRET_KEY per desxifrar el token.')
  }
  console.log('[sendTranscription] Obtenint credencials d_usuari...')
  const { data: creds, error: credsError } = await supabase
    .from('user_credentials')
    .select('refresh_token, provider_user_id')
    .eq('user_id', userId)
    .eq('provider', 'google_gmail')
    .maybeSingle()
  if (credsError)
    throw new Error(`Error obtenint credencials: ${credsError.message}`)
  if (!creds?.refresh_token)
    throw new Error(
      "No s'han trobat les credencials de Google (refresh token). Si us plau, connecta el teu compte a 'Integracions'."
    )
  if (!creds.provider_user_id)
    throw new Error(
      'Les credencials no tenen un email (provider_user_id) associat.'
    )

  console.log('[sendTranscription] Desencriptant refresh token...')
  const decryptedToken = await decryptToken(
    creds.refresh_token,
    process.env.ENCRYPTION_SECRET_KEY
  )

  console.log('[sendTranscription] Sol·licitant nou Google Access Token...')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: decryptedToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokenData: GoogleTokenResponse = await tokenResponse.json()
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('Error en la resposta de Google Token:', tokenData)
    throw new Error("No s'ha pogut refrescar l'access token de Google.")
  }

  console.log('[sendTranscription] Google Access Token obtingut.')
  return {
    accessToken: tokenData.access_token,
    userEmail: creds.provider_user_id,
  }
}

/**
 * HELPER 2: Construeix el cos HTML (Correcte)
 * AQUESTA FUNCIÓ ÉS LA CLAU. SI NO VEUS LES DADES, ÉS PERQUÈ:
 * 1. La funció 't' no troba les claus (ex: 'Email.summaryTitle')
 * 2. 'job.summary' o 'job.key_moments' estan buits a la base de dades.
 */
function buildHtmlBody(
  job: AudioJob,
  t: (key: string) => string // La funció 't' ve de getTranslations
): string {
  // Aquests 'castings' són on podria fallar si el JSONB té un format diferent
  const assignedTasks =
    (job.assigned_tasks_summary as {
      assignee_name: string
      tasks: string[]
    }[]) || []
  const keyMoments =
    (job.key_moments as {
      topic: string
      summary: string
      decisions: string[]
      action_items: string[]
    }[]) || []

  // El disseny HTML és correcte i coincideix amb l'informe desitjat
  const html = `
  <div style="font-family: Arial, sans-serif; color: #222; max-width: 640px; margin: auto; padding: 24px; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h2 style="text-align: center; color: #374151; margin-bottom: 16px; font-size: 22px;">${t(
      'Email.summaryTitle'
    )}</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #555; background: #fff; border-radius: 8px; padding: 16px; border-left: 4px solid #5e6ad2;">
      ${job.summary || t('summaryEmpty')}
    </p>
    
    <div style="margin-top: 32px;">
      ${
        assignedTasks.length > 0
          ? `
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 12px; border-bottom: 2px solid #d1d5db; padding-bottom: 4px;">
        ${t('Email.assignedTasksTitle')}
      </h3>
      <div style="padding-left: 10px; border-left: 3px solid #5e6ad2;">
        ${assignedTasks
          .map(
            (group) => `
          <div style="margin: 16px 0; padding-left: 10px;">
            <div style="font-weight: bold; color: #111827; font-size: 15px;">👤 ${
              group.assignee_name
            }</div>
            <ul style="margin: 6px 0 0 16px; color: #374151; font-size: 14px;">
              ${group.tasks.map((task) => `<li>${task}</li>`).join('')}
            </ul>
          </div>
        `
          )
          .join('')}
      </div>
      `
          : ''
      }
    </div>
    
    ${
      keyMoments.length > 0
        ? `
    <div style="margin-top: 32px;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 12px; border-bottom: 2px solid #d1d5db; padding-bottom: 4px;">
        ${t('keyMomentsTitle')}
      </h3>
      <div style="padding-left: 10px; border-left: 3px solid #10b981;">
        ${keyMoments
          .map(
            (moment) => `
          <div style="margin: 18px 0; padding-left: 10px;">
            <div style="font-weight: bold; font-size: 15px; color: #111827;">🟢 ${
              moment.topic
            }</div>
            <p style="font-size: 14px; color: #555; margin: 4px 0 6px;">${
              moment.summary
            }</p>
            ${
              moment.decisions.length > 0
                ? `
              <div style="font-size: 13px; color: #047857; margin-bottom: 4px;">
                <strong>${t(
                  'keyMomentsDecisions'
                )}:</strong> ${moment.decisions.join(', ')}
              </div>`
                : ''
            }
            ${
              moment.action_items.length > 0
                ? `
              <div style="font-size: 13px; color: #1d4ed8;">
                <strong>${t(
                  'Email.keyMomentsActions'
                )}:</strong> ${moment.action_items.join(', ')}
              </div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }
    
    <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;">
    <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 12px;">
      ${t('Email.footerText')} • RibotFlow
    </p>
  </div>
  `
  return html
}

/**
 * HELPER 3: Construeix el missatge MIME (Correcte)
 */
function buildTranscriptionMimeMessage(
  recipients: string[],
  ccRecipient: string,
  fromEmail: string,
  fromName: string, // Nom de l'empresa
  subject: string,
  htmlBody: string
): string {
  const boundary = `----=${Math.random().toString(16).substring(2)}`

  // Codificació correcta de l'assumpte per a accents/caràcters especials
  let message = `From: ${fromName} <${fromEmail}>\r\n`
  message += `To: ${recipients.join(', ')}\r\n`
  message += `Cc: ${ccRecipient}\r\n`
  message += `Subject: =?UTF-8?B?${Base64.encode(subject, true)}?=\r\n`
  message += `Content-Type: multipart/alternative; boundary=${boundary}\r\n\r\n`

  // Part 1: Text Pla (Fallback)
  message += `--${boundary}\r\n`
  message += `Content-Type: text/plain; charset=UTF-8\r\n`
  message += `Content-Transfer-Encoding: 7bit\r\n\r\n`
  message += `Si us plau, visualitza aquest email en un client compatible amb HTML per veure el resum de la transcripció.\r\n\r\n`

  // Part 2: HTML (Codificat en Base64 per seguretat)
  message += `--${boundary}\r\n`
  message += `Content-Type: text/html; charset=UTF-8\r\n`
  message += `Content-Transfer-Encoding: base64\r\n\r\n`
  message += `${Base64.encode(htmlBody, true)}\r\n\r\n` // Codifiquem l'HTML

  message += `--${boundary}--`

  return message
}

/**
 * ACCIÓ: Envia el resum de la transcripció (Lògica confirmada)
 */
const sendEmailSchema = z.object({
  jobId: z.string().uuid(),
})

export async function sendTranscriptionSummaryEmailAction(
  formData: FormData
): Promise<ActionResult> {
  // 1. Validar sessió
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TRANSLATIONS
  )
  if ('error' in validation) {
    return { success: false, message: validation.error.message }
  }
  const { supabase, activeTeamId, user } = validation

  // 2. Carregar Traduccions
  const t = await getTranslations('Transcripcio')

  // 3. Validar dades del formulari
  const parseResult = sendEmailSchema.safeParse({ jobId: formData.get('jobId') })
  if (!parseResult.success)
    return { success: false, message: t('sendEmailInvalidData') }

  const { jobId } = parseResult.data

  try {
    // 4. Obtenir Dades de la Feina I EL NOM DE L'EQUIP
    console.log(`[sendTranscription] Obtenint dades de la feina ${jobId}...`)
    const { data: jobAndTeamData, error: jobError } = await supabase
      .from('audio_jobs')
      .select('*, team:teams(name)') // Fem un JOIN amb 'teams'
      .eq('id', jobId)
      .eq('team_id', activeTeamId)
      .single()

    if (jobError) throw new Error(`Error obtenint la feina: ${jobError.message}`)

    // Assegurem els tipus
    const job = jobAndTeamData as AudioJob & {
      team: { name: string | null } | null
    }
    const companyName = job.team?.name || 'RibotFlow'

    // 5. Obtenir Emails dels Participants
    const participantIds =
      (job.participants as { contact_id: number | null }[])
        ?.map((p) => p.contact_id)
        .filter((id): id is number => id != null) || []

    const recipientEmails = await transcripcioService.getParticipantEmails(
      supabase,
      participantIds,
      activeTeamId
    )

    if (recipientEmails.length === 0) {
      console.warn(
        `[sendTranscription] No s'han trobat destinataris per a la feina ${jobId}. S'enviarà només a l'usuari en CC.`
      )
    }

    // 6. Obtenir Autenticació de Google
    const { accessToken, userEmail } = await getGoogleAccessToken(
      supabase,
      user.id
    )

    // 7. Traduïm els texts i construïm el cos HTML
    const emailSubject = `Resum de la reunió: ${
      job.summary || `Transcripció ${job.id.substring(0, 8)}`
    }`

    // Passem la funció 't' directament.
    const htmlBody = buildHtmlBody(job, t as (key: string) => string)

    // 8. Construir Missatge MIME
    const mimeMessage = buildTranscriptionMimeMessage(
      recipientEmails,
      user.email ?? '', // CC (el propi usuari)
      userEmail, // FROM (l'email autenticat a Google)
      companyName, // Nom de l'empresa
      emailSubject,
      htmlBody
    )

    // 9. Codificar i Enviar
    // La API de Gmail espera que TOT el missatge (headers inclosos) estigui en Base64 URL-safe
    const rawEmail = Base64.encode(mimeMessage, true)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    console.log(
      `[sendTranscription] Enviant email via Gmail API com a ${userEmail}...`
    )
    const gmailRes = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawEmail }),
      }
    )

    if (!gmailRes.ok) {
      const errorData = await gmailRes.json()
      console.error('Error enviant Gmail:', errorData)
      throw new Error(`Error de l'API de Gmail: ${errorData.error.message}`)
    }

    const allRecipients = [...recipientEmails, user.email].join(', ')
    console.log(
      `[sendTranscription] Email enviat correctament a ${allRecipients}.`
    )

    return { success: true, message: t('Email.sendSuccess') }
  } catch (error: unknown) {
    const message = (error as Error).message
    console.error('Error enviant email de resum (action):', message)
    // Retornem el missatge d'error directe, sigui de traducció, de BD o de Gmail
    return { success: false, message: message }
  }
}