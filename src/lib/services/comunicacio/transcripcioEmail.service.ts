import { type SupabaseClient } from '@supabase/supabase-js'
import { type User } from '@supabase/supabase-js'
import { Base64 } from 'js-base64'

import type { Database } from '@/types/supabase'
import type { AudioJob } from '@/types/db'
import { decryptToken } from '@/lib/utils/crypto'
import * as transcripcioService from '@/lib/services/comunicacio/transcripcio.service' // Per reutilitzar la lògica d'obtenir emails

// --- Lògica interna (no exportada) ---

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

/**
 * HELPER 1: Autenticació de Google
 */
async function getGoogleAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ accessToken: string; userEmail: string }> {
  if (!process.env.ENCRYPTION_SECRET_KEY) {
    throw new Error('Falta ENCRYPTION_SECRET_KEY per desxifrar el token.')
  }
  
  console.log('[EmailService] Obtenint credencials d_usuari...')
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

  console.log('[EmailService] Desencriptant refresh token...')
  const decryptedToken = await decryptToken(
    creds.refresh_token,
    process.env.ENCRYPTION_SECRET_KEY
  )

  console.log('[EmailService] Sol·licitant nou Google Access Token...')
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

  console.log('[EmailService] Google Access Token obtingut.')
  return {
    accessToken: tokenData.access_token,
    userEmail: creds.provider_user_id,
  }
}

/**
 * HELPER 2: Construeix el cos HTML
 */
function buildHtmlBody(
  job: AudioJob,
  t: (key: string) => string // La funció 't' ve de getTranslations
): string {
  // ... (El contingut d'aquesta funció és IDÈNTIC a l'original)
  // (Copiar i enganxar la funció 'buildHtmlBody' original aquí)
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
 * HELPER 3: Construeix el missatge MIME
 */
function buildTranscriptionMimeMessage(
  recipients: string[],
  ccRecipient: string,
  fromEmail: string,
  fromName: string, // Nom de l'empresa
  subject: string,
  htmlBody: string
): string {
  // ... (El contingut d'aquesta funció és IDÈNTIC a l'original)
  // (Copiar i enganxar la funció 'buildTranscriptionMimeMessage' original aquí)
  const boundary = `----=${Math.random().toString(16).substring(2)}`

  let message = `From: ${fromName} <${fromEmail}>\r\n`
  message += `To: ${recipients.join(', ')}\r\n`
  message += `Cc: ${ccRecipient}\r\n`
  message += `Subject: =?UTF-8?B?${Base64.encode(subject, true)}?=\r\n`
  message += `Content-Type: multipart/alternative; boundary=${boundary}\r\n\r\n`

  message += `--${boundary}\r\n`
  message += `Content-Type: text/plain; charset=UTF-8\r\n`
  message += `Content-Transfer-Encoding: 7bit\r\n\r\n`
  message += `Si us plau, visualitza aquest email en un client compatible amb HTML per veure el resum de la transcripció.\r\n\r\n`

  message += `--${boundary}\r\n`
  message += `Content-Type: text/html; charset=UTF-8\r\n`
  message += `Content-Transfer-Encoding: base64\r\n\r\n`
  message += `${Base64.encode(htmlBody, true)}\r\n\r\n` 

  message += `--${boundary}--`

  return message
}


// --- Lògica principal (EXPORTADA) ---

/**
 * Orquestra l'enviament d'un resum de transcripció per email.
 */
export async function sendTranscriptionSummaryEmail(
  supabase: SupabaseClient<Database>,
  user: User,
  activeTeamId: string,
  jobId: string,
  t: (key: string) => string // Passar la funció de traducció
) {
  try {
    // 1. Obtenir Dades de la Feina I EL NOM DE L'EQUIP
    console.log(`[EmailService] Obtenint dades de la feina ${jobId}...`)
    const { data: jobAndTeamData, error: jobError } = await supabase
      .from('audio_jobs')
      .select('*, team:teams(name)') // Fem un JOIN amb 'teams'
      .eq('id', jobId)
      .eq('team_id', activeTeamId)
      .single()

    if (jobError) throw new Error(`Error obtenint la feina: ${jobError.message}`)

    const job = jobAndTeamData as AudioJob & {
      team: { name: string | null } | null
    }
    const companyName = job.team?.name || 'RibotFlow'

    // 2. Obtenir Emails dels Participants
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
        `[EmailService] No s'han trobat destinataris per a la feina ${jobId}. S'enviarà només a l'usuari en CC.`
      )
    }

    // 3. Obtenir Autenticació de Google
    const { accessToken, userEmail } = await getGoogleAccessToken(
      supabase,
      user.id
    )

    // 4. Traduïm els texts i construïm el cos HTML
    const emailSubject = `Resum de la reunió: ${
      job.summary || `Transcripció ${job.id.substring(0, 8)}`
    }`
    
    // Passem la funció 't' directament.
    const htmlBody = buildHtmlBody(job, t)

    // 5. Construir Missatge MIME
    const mimeMessage = buildTranscriptionMimeMessage(
      recipientEmails,
      user.email ?? '', // CC (el propi usuari)
      userEmail, // FROM (l'email autenticat a Google)
      companyName, // Nom de l'empresa
      emailSubject,
      htmlBody
    )

    // 6. Codificar i Enviar
    const rawEmail = Base64.encode(mimeMessage, true)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    console.log(
      `[EmailService] Enviant email via Gmail API com a ${userEmail}...`
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
      `[EmailService] Email enviat correctament a ${allRecipients}.`
    )

    return { success: true, message: t('Email.sendSuccess') }
  
  } catch (error: unknown) {
    const message = (error as Error).message
    console.error('Error enviant email de resum (servei):', message)
    // Propaguem l'error perquè l'action el capturi
    throw new Error(message)
  }
}