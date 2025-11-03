'use server'
// src/lib/services/comunicacio/transcripcio.service.ts
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { DbTableInsert} from '@/types/db';
import { revalidatePath } from 'next/cache'
import { validateUserSession } from '@/lib/supabase/session'
// ✅ 1. Importem el tipus NOMÉS per a ús intern.
import * as transcripcioService from '@/lib/services/comunicacio/transcripcio.service'
import type { CreateAudioJobArgs } from '@/lib/services/comunicacio/transcripcio.service'
import { z } from 'zod'
// ✅ 1. Imports per a l'enviament d'email
import { Resend } from 'resend' // Assumim que fem servir Resend
import { TranscriptionSummaryEmail } from '@/emails/TranscriptionSummaryEmail' // La nostra plantilla
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation';
// ❌ 2. ELIMINEM la línia que fa "crash"
// export type { AudioJob }; 

/**
 * ACCIÓ: Crea una nova feina (job) a la taula 'audio_jobs'.
 */
export async function createAudioJob(args: CreateAudioJobArgs) {
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, user, activeTeamId } = session

  try {
    // 2. Cridar al servei
    const jobId = await transcripcioService.createAudioJob(
        supabase,
        args,
        user.id,
        activeTeamId
    );

    // 3. Efecte secundari
    // ✅ CANVI: Afegit el paràmetre 'layout' per a la revalidació dinàmica.
    revalidatePath('/[locale]/(app)/comunicacio/transcripcio', 'layout')
    return { success: true, jobId: jobId }

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = (error as Error).message;
    console.error('Error creant audio_job (action):', message)
    return { error: message }
  }
}

/**
 * ACCIÓ: Obté els detalls d'una feina d'àudio específica.
 */
export async function getAudioJobDetails(jobId: string) {
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  try {
    // 2. Cridar al servei
    const job = await transcripcioService.getAudioJobDetails(supabase, jobId, activeTeamId);
    return { data: job };
  } catch (error: unknown) {
    // 3. Gestió d'errors
    const message = (error as Error).message;
    return { error: message };
  }
}

/**
 * ACCIÓ: Obté totes les feines d'àudio per a l'equip actiu.
 */
export async function getTeamAudioJobs() {
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  try {
    // 2. Cridar al servei
    const jobs = await transcripcioService.getTeamAudioJobs(supabase, activeTeamId);
    return { data: jobs };
  } catch (error: unknown) {
    // 3. Gestió d'errors
    const message = (error as Error).message;
    return { error: message };
  }
}

// --- NOVA ACCIÓ PER CREAR TASQUES MANUALS ---

// Esquema de validació per a la nova tasca
const createTaskSchema = z.object({
  title: z.string().min(3, "El títol ha de tenir almenys 3 caràcters."),
  description: z.string().optional().nullable(),
  contact_id: z.number().nullable(),
  project_id: z.string().uuid().nullable(), // Assumim que project_id és un UUID
  job_id: z.number(), // Per enllaçar la tasca a la feina d'àudio
});

export async function createTaskFromTranscription(formData: FormData) {
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, user, activeTeamId } = session

  // 2. Validar dades del formulari
  const parseResult = createTaskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    contact_id: formData.get('contact_id') ? Number(formData.get('contact_id')) : null,
    project_id: formData.get('project_id') || null,
    job_id: Number(formData.get('job_id')),
  });

  if (!parseResult.success) {
    return { error: 'Dades invàlides.', details: parseResult.error.flatten() };
  }

  const { title, description, contact_id,  job_id } = parseResult.data;

  // 3. Preparar dades per a la inserció
  const taskToInsert: DbTableInsert<'tasks'> = {
    team_id: activeTeamId,
    user_id: user.id,
    title,
    description: description || null,
    contact_id: contact_id || null,
    is_completed: false,
    priority: 'Mitjana', // Prioritat per defecte
  };
  
  // Alternativa si 'audio_job_id' no existeix:
  const finalDescription = (description || '') + 
    `\n\n---
    Tasca creada a partir de la transcripció: ${job_id}`;

  taskToInsert.description = finalDescription;


  // 4. Inserir a la base de dades
  try {
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(taskToInsert);

    if (insertError) {
      throw new Error(insertError.message);
    }

    // 5. Revalidar i retornar èxit
    revalidatePath('/[locale]/(app)/crm/activitats'); // Revalidem la pàgina de tasques
    revalidatePath(`/[locale]/(app)/comunicacio/transcripcio/${job_id}`); // Revalidem la pàgina del job

    return { success: true };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error('Error creant la tasca (action):', message);
    return { error: `No s'ha pogut crear la tasca: ${message}` };
  }
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

// --- ✅ 2. NOVA ACCIÓ PER ESBORRAR TRANSCRIPCIÓ ---

const deleteJobSchema = z.object({
  jobId: z.string().uuid(),
  storagePath: z.string().min(1),
  locale: z.string().min(2),
});

export async function deleteAudioJobAction(formData: FormData) {
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId } = session

  // 2. Validar dades
  const parseResult = deleteJobSchema.safeParse({
    jobId: formData.get('jobId'),
    storagePath: formData.get('storagePath'),
    locale: formData.get('locale'),
  });

  if (!parseResult.success) {
    return { error: 'Dades invàlides.' };
  }
  
  const { jobId, storagePath, locale } = parseResult.data;

  // 3. Cridar al servei
  try {
    await transcripcioService.deleteAudioJob(supabase, jobId, activeTeamId, storagePath);
  } catch (error: unknown) {
    return { error: (error as Error).message };
  }

  // 4. Revalidar i redirigir
  revalidatePath('/[locale]/(app)/comunicacio/transcripcio', 'layout');
  redirect(`/${locale}/comunicacio/transcripcio`);
}


// --- ✅ 3. NOVA ACCIÓ PER ENVIAR RESUM PER EMAIL ---

const sendEmailSchema = z.object({
  jobId: z.string().uuid(),
});

export async function sendTranscriptionSummaryEmailAction(formData: FormData) {
  // 1. Validar sessió
  const session = await validateUserSession()
  if ('error' in session) {
    return { error: session.error.message }
  }
  const { supabase, activeTeamId, user } = session;
  const t = await getTranslations('Transcripcio'); // Carreguem traduccions

  // 2. Validar dades
  const parseResult = sendEmailSchema.safeParse({
    jobId: formData.get('jobId'),
  });
  if (!parseResult.success) return { error: t('sendEmailInvalidData') };
  
  const { jobId } = parseResult.data;

  // 3. Inicialitzar Resend (o el teu proveïdor d'email)
  if (!process.env.RESEND_API_KEY) {
    return { error: 'RESEND_API_KEY no està configurat.' };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // 4. Obtenir Dades de la Feina (incloent key_moments)
    const job = await transcripcioService.getAudioJobDetails(supabase, jobId, activeTeamId);
    
    // 5. Obtenir Emails dels Participants
    const participantIds = (job.participants as { contact_id: number | null }[])
        ?.map(p => p.contact_id)
        .filter(id => id != null) || [];
        
    const recipientEmails = await transcripcioService.getParticipantEmails(supabase, participantIds, activeTeamId);

    if (recipientEmails.length === 0) {
      return { error: t('sendEmailNoRecipients') };
    }

    // 6. Renderitzar la plantilla de React Email a HTML
    const emailSubject = t('sendEmailSubject', { jobDate: new Date(job.created_at).toLocaleDateString('ca-ES') });
    
    const { data: emailHtml, error: renderError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'RibotFlow <no-reply@ribotflow.com>',
        to: recipientEmails,
        cc: user.email, // Enviem una còpia a l'usuari que fa l'acció
        subject: emailSubject,
        // Passem les dades a la nostra plantilla
        react: TranscriptionSummaryEmail({
          job: job,
          emailSubject: emailSubject,
          t: t, // Passem les traduccions
        }),
    });

    if (renderError) {
      throw new Error(`Error renderitzant email: ${renderError.message}`);
    }

    return { success: true };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error('Error enviant email de resum (action):', message);
    return { error: message };
  }
}