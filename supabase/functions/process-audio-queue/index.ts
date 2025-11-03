// supabase/functions/process-audio-queue/index.ts

// ✨ CORRECCIÓ 1: Imports nets (funcionaran amb l'import_map.json)
import { serve } from 'std/http/server.ts';
import { createClient, SupabaseClient } from 'supabase-js';
import { OpenAI } from 'openai';

// Definim els tipus per a les dades
interface Participant {
  contact_id: number;
  name: string;
  role: string;
}

interface AudioJob {
  id: string;
  storage_path: string;
  team_id: string;
  user_id: string;
  project_id?: string; // Encara que existeixi aquí, no l'usarem a 'tasks'
  participants: Participant[];
}

interface ExtractedTask {
  task: string;
  assignee_name: string;
}

// Inicialitzem el client d'OpenAI
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// Funció principal que s'executa amb la crida de pg_cron
serve(async (_req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ✨ CORRECCIÓ 2: S'ha eliminat .forUpdate().skipLocked() per evitar el crash
    const { data: jobsData, error: selectError } = await supabaseAdmin
      .from('audio_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5); // <-- El .forUpdate() ja no hi és

    if (selectError) {
      throw new Error(`Error seleccionant feines: ${selectError.message}`);
    }

    const jobs = jobsData as AudioJob[]; // ✨ CORRECCIÓ: Fem el cast aquí per evitar 'any'

    if (!jobs || jobs.length === 0) {
      console.log('No hi ha feines pendents. Sortint.');
      return new Response(
        JSON.stringify({ message: 'No hi ha feines pendents' }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Processant ${jobs.length} feina(es).`);

    const jobIds = jobs.map((job: AudioJob) => job.id);
    await supabaseAdmin
      .from('audio_jobs')
      .update({ status: 'processing' })
      .in('id', jobIds);

    const processingPromises = jobs.map((job: AudioJob) =>
      processJob(supabaseAdmin, job)
    );
    await Promise.all(processingPromises);

    return new Response(
      JSON.stringify({ message: `Processades ${jobs.length} feina(es)` }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err: unknown) {
    let errorMessage = 'Error desconegut al worker principal.';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error('Error al worker principal:', errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Funció que processa una única feina d'àudio.
 */
async function processJob(supabaseAdmin: SupabaseClient, job: AudioJob) {
  try {
    // 1. Obtenir l'arxiu d'àudio
    const { data: audioBlob, error: storageError } = await supabaseAdmin.storage
      .from('audio-uploads')
      .download(job.storage_path);

    if (storageError) {
      throw new Error(`Error descarregant àudio: ${storageError.message}`);
    }

    const audioFile = new File([audioBlob], 'audio.mp3', {
      type: audioBlob.type,
    });

    // 2. Transcriure l'àudio (Whisper)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    const transcriptionText = transcription.text;

    // 3. Generar llista de participants per al prompt
    const participantsList = job.participants
      .map((p) => `- ${p.name} (Rol: ${p.role})`)
      .join('\n');

    // 4. Crear el Prompt Dinàmic (el teu prompt millorat)
    const analysisPrompt = `
      Ets un Assistent Tècnic expert en analitzar transcripcions de reunions.
      La teva missió és extreure tasques i assignar-les a la persona correcta.

      👥 PARTICIPANTS DE LA REUNIÓ:
      Aquesta reunió inclou les següents persones. Fes servir aquesta llista
      per identificar a qui s'assigna cada tasca:
      ${
      participantsList.length > 0
        ? participantsList
        : "No s'han identificat participants."
    }
      
      📜 LA TEVA TASCA:
      1. Analitza la transcripció.
      2. Extreu tasques, decisions i detalls tècnics (mides, materials, etc.).
      3. Assigna cada tasca a un dels participants.
      4. Si una tasca és general i no per a algú específic, assigna-la al rol (ex: "Pintor", "Lampista").

      ❌ REGLES:
      - Inclou detalls tècnics (mides, codis RAL, models) a la descripció de la tasca.
      - Fes servir el NOM EXACTE (ex: "Marta", "Josep") a la clau "assignee_name".
      - NO t'inventis noms. Si no és a la llista, utilitza el rol (ex: "Client").
      
      ---
      TRANSCRIPCIÓ:
      "${transcriptionText}"
      ---

      Respon ÚNICAMENT en format JSON amb l'estructura:
      {
        "summary": "Resum concís de la reunió...",
        "tasks": [
          { "task": "Descripció detallada de la tasca 1 (ex: pintar paret despatx RAL 9010)", "assignee_name": "Marta" },
          { "task": "Descripció detallada de la tasca 2 (ex: instal·lar porta garatge)", "assignee_name": "Josep" },
          { "task": "Tasca general 3", "assignee_name": "Lampista" }
        ]
      }
    `;

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    });

    // ✨ CORRECCIÓ 3: Comprovació de nul abans de JSON.parse()
    const content = analysis.choices[0].message.content;
    if (!content) {
      throw new Error("La resposta d'OpenAI no té contingut.");
    }

    const resultJson = JSON.parse(content);
    const summary = resultJson.summary;
    const tasks: ExtractedTask[] = resultJson.tasks;

    // 5. Actualitzar la feina a 'completed'
    await supabaseAdmin
      .from('audio_jobs')
      .update({
        status: 'completed',
        transcription_text: transcriptionText,
        summary: summary,
      })
      .eq('id', job.id);

    // 6. Desar les tasques amb 'contact_id'
    if (tasks && tasks.length > 0) {
      const getContactIdFromName = (name: string): number | null => {
        const participant = job.participants.find(
          (p) => p.name.toLowerCase() === name.toLowerCase(),
        );
        return participant ? participant.contact_id : null;
      };

      // ✨ CORRECCIÓ 4: S'ha eliminat 'project_id'
      const tasksToInsert = tasks.map((task: ExtractedTask) => {
        const contactId = getContactIdFromName(task.assignee_name);

        return {
          team_id: job.team_id,
          user_id: job.user_id,
          title: contactId
            ? task.task
            : `[Per a: ${task.assignee_name}] ${task.task}`,
          contact_id: contactId,
          is_completed: false,
          priority: 'Mitjana' as const,
          due_date: null,
          // ❌ 'project_id' ESBORRAT
        };
      });

      const { error: taskInsertError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToInsert);

      if (taskInsertError) {
        throw new Error(
          `Tasca completada però error inserint tasques: ${taskInsertError.message}`,
        );
      }
    }
  } catch (err: unknown) {
    let errorMessage = `Error processant la feina ${job.id}.`;
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error(`Error processant la feina ${job.id}:`, errorMessage);

    // 7. Si falla, actualitzem la feina a 'failed'
    await supabaseAdmin
      .from('audio_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', job.id);
  }
}
