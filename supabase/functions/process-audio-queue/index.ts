// supabase/functions/process-audio-queue/index.ts

import { serve } from 'std/http/server.ts';
import { createClient, SupabaseClient } from 'supabase-js';
import { OpenAI } from 'openai';

// --- Tipus ---
interface Participant {
  contact_id: number;
  name: string;
  role: string;
}

interface EnrichedParticipant extends Participant {
  industry?: string | null;
}

interface AudioJob {
  id: string;
  storage_path: string;
  team_id: string;
  user_id: string;
  project_id?: string | null; // Assegurem que pugui ser null
  participants: Participant[];
}

interface ExtractedTask {
  task: string;
  assignee_name: string;
}

// ✅ NOU: Tipus per al flux de la reunió
interface KeyMoment {
  topic: string; // Títol del tema (ex: "Discussió Sòl")
  details: string; // Resum del que s'ha parlat
  decisions: string[]; // Llista de decisions preses
  is_work_related: boolean; // Per filtrar el soroll
}

// --- Funció Principal (sense canvis) ---
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (_req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: jobsData, error: selectError } = await supabaseAdmin
      .from('audio_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (selectError) {
      throw new Error(`Error seleccionant feines: ${selectError.message}`);
    }

    const jobs = jobsData as AudioJob[];

    if (!jobs || jobs.length === 0) {
      console.log('No hi ha feines pendents. Sortint.');
      return new Response(
        JSON.stringify({ message: 'No hi ha feines pendents' }),
        { headers: { 'Content-Type': 'application/json' } },
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
      { headers: { 'Content-Type': 'application/json' } },
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

// --- Processador de Feines (AMB CANVIS IMPORTANTS) ---
async function processJob(supabaseAdmin: SupabaseClient, job: AudioJob) {
  try {
    // 1. Obtenir Àudio (sense canvis)
    const { data: audioBlob, error: storageError } = await supabaseAdmin.storage
      .from('audio-uploads')
      .download(job.storage_path);
    if (storageError) {
      throw new Error(`Error descarregant àudio: ${storageError.message}`);
    }
    const audioFile = new File([audioBlob], 'audio.mp3', {
      type: audioBlob.type,
    });

    // 2. Transcriure Àudio (sense canvis)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });
    const transcriptionText = transcription.text;

    // 3. Enriquir Participants (sense canvis, ja era correcte)
    let enrichedParticipants: EnrichedParticipant[] = job.participants || [];
    if (job.participants && job.participants.length > 0) {
      const contactIds = job.participants.map((p) => p.contact_id).filter(
        (id) => id != null,
      );
      if (contactIds.length > 0) {
        const { data: contactsData, error: contactsError } = await supabaseAdmin
          .from('contacts')
          .select('id, industry')
          .in('id', contactIds);
        if (!contactsError && contactsData) {
          const industryMap = new Map(
            contactsData.map((
              c: { id: number; industry: string | null },
            ) => [c.id, c.industry]),
          );
          enrichedParticipants = job.participants.map((p) => ({
            ...p,
            industry: typeof industryMap.get(p.contact_id) === 'string'
              ? industryMap.get(p.contact_id) as string | null
              : null,
          }));
        }
      }
    }
    const participantsList = enrichedParticipants
      .map((p) => {
        const specialties = [p.role, p.industry].filter(Boolean).join(', ');
        return `- ${p.name}${
          specialties ? ` (Especialitat: ${specialties})` : ''
        }`;
      })
      .join('\n');

    // ✅ CANVI: Pas 4: Nou Prompt Millorat
    const analysisPrompt = `
Ets un Assistent Tècnic expert en analitzar transcripcions de reunions i projectes. La teva missió és analitzar una transcripció d'una reunió i extreure totes les dades tècniques, tasques i decisions amb la màxima precisió, sense ometre detalls.

📜 La Teva Tasca Principal:
Anàlisi Exhaustiva: Llegeix tota la transcripció i centra't en els detalls tècnics.

Extracció Precisa: Per a cada departament, has d'identificar i extreure de manera literal i completa:

Tasques assignades: Què s'ha de fer exactament.

Decisions preses: Acords i solucions aprovades.

Les tasques s’han d’ordenar segons el seu flux de dependència. Si una tasca requereix una acció prèvia (com obtenir un permís abans d'executar una obra), aquesta acció ha de situar-se primer en la seqüència.

Dades Tècniques Clau: Presta especial atenció a:

Codis de materials (p. ex., "pintura RAL 9010", "acer corten", "IPE-200").

Mides i cotes exactes ("canonada de 22mm", "paret de 15cm").

Noms d'eines, marques o models específics.

Dates i terminis concrets ("abans de dijous", "la setmana del 15").

Problemes tècnics descrits (p. ex., "fuita a la junta", "humitat per capil·laritat").

Creació de Resums Globals: Genera un title i un generalSummary que capturin l'essència del meeting.

Generació del JSON: Construeix l'objecte JSON de sortida amb tota la informació recopilada.

❌ Regles del que NO has de fer:
No resumeixis en excés: És preferible que un resum de tasca sigui llarg i detallat a què sigui curt i li falti informació. Prioritza la precisió sobre la brevetat.

No ignoris números o codis: Qualsevol dada numèrica, codi o nom propi és potencialment crític. Inclou-ho sempre.

Filtra només el personal: Ignora únicament les converses personals que no tenen cap relació amb el projecte (salutacions, com va el cap de setmana, etc.).

Només inclou departaments que tinguin tasques assignades.
No t'inventis dates o horaris si la reunio no s'ha dit.


      👥 PARTICIPANTS CONEGUTS (AJUDA):
      ${
      participantsList.length > 0 ? participantsList : "No s'han proporcionat."
    }
      
      🧠 DETECCIÓ DE PARTICIPANTS:
      La transcripció pot esmentar altres rols (ex: 'el fuster', 'el lampista').
      Has d'assignar tasques a aquestes persones també.

      ---
      TRANSCRIPCIÓ:
      "${transcriptionText}"
      ---

      Respon ÚNICAMENT en format JSON amb l'estructura següent:
      {
        "summary": "Resum concís de la reunió...",
        
        "key_moments": [
          {
            "topic": "Títol del tema principal 1 (ex: 'Anàlisi del Sòl')",
            "details": "Resum del que s'ha parlat sobre aquest tema.",
            "decisions": ["Decisió 1 presa", "Decisió 2 presa"],
            "is_work_related": true
          },
          {
            "topic": "Comentari sobre el cap de setmana",
            "details": "En Josep explica que ha anat a la platja.",
            "decisions": [],
            "is_work_related": false 
          },
          {
            "topic": "Elecció de Pintura",
            "details": "Es discuteix entre el RAL 9010 i el 9003. S'escull el 9010.",
            "decisions": ["Pintar amb RAL 9010"],
            "is_work_related": true
          }
        ],
        
        "tasks": [
          { "task": "Comprar pintura RAL 9010 per al despatx", "assignee_name": "Marta" },
          { "task": "Contactar amb el fuster per a la porta", "assignee_name": "Josep" }
        ]
      }
    `;

    // 5. Cridar a OpenAI (sense canvis)
    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    });

    // 6. Processar resposta (sense canvis)
    const content = analysis.choices[0].message.content;
    if (!content) throw new Error("La resposta d'OpenAI no té contingut.");

    const resultJson = JSON.parse(content);
    const summary = resultJson.summary;
    const tasks: ExtractedTask[] = resultJson.tasks;
    // ✅ NOU: Capturem els moments clau
    const keyMoments: KeyMoment[] = resultJson.key_moments;

    // ✅ CANVI: Pas 7: Actualitzar la feina a 'completed' (amb les noves dades)
    await supabaseAdmin
      .from('audio_jobs')
      .update({
        status: 'completed',
        transcription_text: transcriptionText,
        summary: summary,
        key_moments: keyMoments as KeyMoment[], // Desem el JSON
      })
      .eq('id', job.id);

    // 8. Desar les tasques (sense canvis, ja era correcte)
    if (tasks && tasks.length > 0) {
      const getContactIdFromName = (name: string): number | null => {
        const participant = enrichedParticipants.find(
          (p) => p.name.toLowerCase() === name.toLowerCase(),
        );
        return participant ? participant.contact_id : null;
      };

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
    // 9. Gestió d'errors (sense canvis)
    let errorMessage = `Error processant la feina ${job.id}.`;
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error(`Error processant la feina ${job.id}:`, errorMessage);

    await supabaseAdmin
      .from('audio_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', job.id);
  }
}
