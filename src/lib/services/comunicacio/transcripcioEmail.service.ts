// src/lib/services/comunicacio/transcripcioEmail.service.ts (FITXER CORREGIT I COMPLET)
'use server'

import { type SupabaseClient } from '@supabase/supabase-js'
import { type User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { AudioJob } from '@/types/db'
import { decryptToken } from '@/lib/utils/crypto'
import * as transcripcioService from '@/lib/services/comunicacio/transcripcio.service'

// --- HELPER 1: getGoogleAccessToken (Sense canvis) ---
interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}
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
 * ✅ HELPER 2 (HTML CORREGIT): Construeix el cos HTML amb millor disseny.
 */
function buildHtmlBody(
  job: AudioJob,
  t: (key: string) => string
): string {
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

  // Estils millorats
  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; color: #333; max-width: 600px; margin: auto; padding: 20px; background: #fdfdfd; border-radius: 8px; border: 1px solid #eaeaea;">
    <h2 style="text-align: center; color: #111; margin-bottom: 24px; font-size: 24px; font-weight: 600;">${t(
      'Email.summaryTitle'
    )}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #444; background: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 4px solid #5e6ad2; margin: 0 0 24px;">
      ${job.summary || t('summaryEmpty')}
    </p>
    
    <div style="margin-top: 32px;">
      ${
        assignedTasks.length > 0
          ? `
      <h3 style="font-size: 20px; color: #111; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; font-weight: 600;">
        ${t('Email.assignedTasksTitle')}
      </h3>
      <div style="padding-left: 10px;">
        ${assignedTasks
          .map(
            (group) => `
          <div style="margin: 0 0 20px; padding-left: 10px;">
            <div style="font-weight: 600; color: #111; font-size: 17px; margin-bottom: 8px;">👤 ${
              group.assignee_name
            }</div>
            <ul style="margin: 0 0 0 20px; padding: 0; color: #333; font-size: 16px; line-height: 1.5;">
              ${group.tasks
                .map(
                  (task) =>
                    `<li style="margin-bottom: 6px;">${task}</li>`
                )
                .join('')}
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
      <h3 style="font-size: 20px; color: #111; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; font-weight: 600;">
        ${t('keyMomentsTitle')}
      </h3>
      <div style="padding-left: 10px;">
        ${keyMoments
          .map(
            (moment) => `
          <div style="margin: 0 0 24px; padding-left: 10px; border-left: 3px solid #10b981;">
            <div style="font-weight: 600; font-size: 17px; color: #111; margin-bottom: 6px;">🟢 ${
              moment.topic
            }</div>
            <p style="font-size: 16px; color: #444; margin: 4px 0 10px; line-height: 1.6;">${
              moment.summary
            }</p>
            ${
              moment.decisions.length > 0
                ? `
            <div style="font-size: 15px; color: #047857; margin-bottom: 4px; padding: 6px 10px; background: #f0fdf4; border-radius: 6px;">
              <strong style="font-weight: 600;">${t(
                'keyMomentsDecisions'
              )}:</strong> ${moment.decisions.join(', ')}
            </div>`
                : ''
            }
            ${
              moment.action_items.length > 0
                ? `
            <div style="font-size: 15px; color: #1d4ed8; margin-top: 6px; padding: 6px 10px; background: #eff6ff; border-radius: 6px;">
              <strong style="font-weight: 600;">${t(
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
    
    <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">
    <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
      ${t('Email.footerText')} • RibotFlow
    </p>
  </div>
  `
  return html
}

/**
 * ✅ HELPER 2.5 (TEXT PLA CORREGIT): Construeix el cos en Text Pla més net.
 */
function buildPlainTextBody(
  job: AudioJob,
  t: (key: string) => string
): string {
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

  let text = `*** ${t('Email.summaryTitle')} ***\n`
  text += `--------------------------------------------------\n\n`
  text += `${job.summary || t('summaryEmpty')}\n\n`

  if (assignedTasks.length > 0) {
    text += `*** ${t('Email.assignedTasksTitle')} ***\n`
    text += `--------------------------------------------------\n\n`
    assignedTasks.forEach((group, index) => {
      // Afegeix un salt de línia ABANS del següent usuari, però no del primer
      if (index > 0) text += `\n`
      text += `👤 ${group.assignee_name}:\n`
      group.tasks.forEach((task) => {
        text += `   - ${task}\n` // Més indentació
      })
    })
    text += `\n` // Un salt de línia al final del bloc
  }

  if (keyMoments.length > 0) {
    text += `*** ${t('keyMomentsTitle')} ***\n`
    text += `--------------------------------------------------\n\n`
    keyMoments.forEach((moment, index) => {
      if (index > 0) text += `\n`
      text += `🟢 ${moment.topic}\n`
      text += `${moment.summary}\n`
      if (moment.decisions.length > 0) {
        text += `   -> ${t('keyMomentsDecisions')}: ${moment.decisions.join(
          ', '
        )}\n`
      }
      if (moment.action_items.length > 0) {
        text += `   -> ${t(
          'Email.keyMomentsActions'
        )}: ${moment.action_items.join(', ')}\n`
      }
    })
    text += `\n`
  }

  text += `\n--\n${t('Email.footerText')} • RibotFlow\n`
  return text
}


/**
 * ✅ HELPER 3 (CORREGIT): Construeix el missatge MIME amb Node.js Buffer
 */
function buildTranscriptionMimeMessage(
  recipients: string[],
  ccRecipient: string,
  fromEmail: string,
  fromName: string, 
  subject: string,
  htmlBody: string,
  plainTextBody: string 
): string {
  const boundary = `----=${Math.random().toString(16).substring(2)}`
  
  // Utilitzem Buffer.from(text).toString('base64')
  // 'Buffer' és natiu de Node.js i gestiona UTF-8 correctament.
  const encodedSubject = Buffer.from(subject).toString('base64');
  const encodedPlainText = Buffer.from(plainTextBody).toString('base64');
  const encodedHtml = Buffer.from(htmlBody).toString('base64');

  let message = `From: ${fromName} <${fromEmail}>\r\n`
  message += `To: ${recipients.join(', ')}\r\n`
  message += `Cc: ${ccRecipient}\r\n`
  message += `Subject: =?UTF-8?B?${encodedSubject}?=\r\n`
  message += `Content-Type: multipart/alternative; boundary=${boundary}\r\n\r\n`

  // --- PART 1: TEXT PLA ---
  message += `--${boundary}\r\n`
  message += `Content-Type: text/plain; charset=UTF-8\r\n`
  message += `Content-Transfer-Encoding: base64\r\n\r\n` 
  message += `${encodedPlainText}\r\n\r\n`

  // --- PART 2: HTML ---
  message += `--${boundary}\r\n`
  message += `Content-Type: text/html; charset=UTF-8\r\n`
  message += `Content-Transfer-Encoding: base64\r\n\r\n`
  message += `${encodedHtml}\r\n\r\n` 

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
  t: (key: string) => string 
) {
  try {
    // 1. Obtenir Dades de la Feina I EL NOM DE L'EQUIP
    console.log(`[EmailService] Obtenint dades de la feina ${jobId}...`)
    const { data: jobAndTeamData, error: jobError } = await supabase
      .from('audio_jobs')
      .select('*, team:teams(name)') 
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

    // 4. Traduïm els texts i construïm ELS DOS COSSOS
    const emailSubject = `Resum de la reunió: ${
      job.summary || `Transcripció ${job.id.substring(0, 8)}`
    }`
    
    const htmlBody = buildHtmlBody(job, t)
    const plainTextBody = buildPlainTextBody(job, t) 

    // 5. Construir Missatge MIME
    const mimeMessage = buildTranscriptionMimeMessage(
      recipientEmails,
      user.email ?? '', // CC
      userEmail, // FROM
      companyName, 
      emailSubject,
      htmlBody,
      plainTextBody 
    )

    // 6. Codificar per a la URL de l'API de GMAIL
    const rawEmail = Buffer.from(mimeMessage).toString('base64url');

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
    throw new Error(message)
  }
}