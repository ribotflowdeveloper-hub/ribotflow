// supabase/functions/process-audio-queue/index.ts (FITXER COMPLET I CORREGIT)

import { serve } from 'std/http/server.ts'
import { createClient, SupabaseClient } from 'supabase-js'
import { OpenAI } from 'openai'

// --- Tipus ---
interface Participant {
  contact_id: number
  name: string
  role: string
}

// ✅ CORRECCIÓ: Afegim 'gender' que ve de la BD
interface EnrichedParticipant extends Participant {
  industry?: string | null
  gender?: string | null
}

interface AudioJob {
  id: string
  storage_path: string
  team_id: string
  user_id: string
  project_id?: string | null
  participants: Participant[]
}

// ✅ 1. NOUS TIPUS DE RESPOSTA DE L'IA
interface SpeakerIdentity {
  speaker_label: string // Ex: "Speaker A"
  identified_name: string // Ex: "Marta Ribot"
  role: string // Ex: "Arquitecta (Client)"
  reasoning: string // Ex: "Esmenta 'els meus plànols'"
}

interface DialogueEntry {
  speaker_name: string // Nom identificat (ex: "Marta Ribot") o label (ex: "Speaker A")
  text: string
}

interface KeyMoment {
  topic: string // Títol del tema
  summary: string // Resum del que s'ha parlat
  decisions: string[] // Llista de decisions preses
  action_items: string[] // Llista de tasques esmentades (sense assignar)
  participants_involved: string[] // Noms dels qui han participat
}
// ✅ 1. NOU TIPUS: Resum de tasques per persona
interface AssignedTaskSummary {
  assignee_name: string
  tasks: string[]
}
// --- Funció Principal (sense canvis) ---
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
})

serve(async (_req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: jobsData, error: selectError } = await supabaseAdmin
      .from('audio_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (selectError) {
      throw new Error(`Error seleccionant feines: ${selectError.message}`)
    }

    const jobs = jobsData as AudioJob[]

    if (!jobs || jobs.length === 0) {
      console.log('No hi ha feines pendents. Sortint.')
      return new Response(
        JSON.stringify({ message: 'No hi ha feines pendents' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processant ${jobs.length} feina(es).`)

    const jobIds = jobs.map((job: AudioJob) => job.id)
    await supabaseAdmin
      .from('audio_jobs')
      .update({ status: 'processing' })
      .in('id', jobIds)

    const processingPromises = jobs.map((job: AudioJob) =>
      processJob(supabaseAdmin, job)
    )
    await Promise.all(processingPromises)

    return new Response(
      JSON.stringify({ message: `Processades ${jobs.length} feina(es)` }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    let errorMessage = 'Error desconegut al worker principal.'
    if (err instanceof Error) {
      errorMessage = err.message
    }
    console.error('Error al worker principal:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// --- Processador de Feines (AMB L'ESBORRAT AFEGIT) ---
async function processJob(supabaseAdmin: SupabaseClient, job: AudioJob) {
  try {
    // 1. Obtenir Àudio (sense canvis)
    console.log(`[processJob ${job.id}] Descarregant àudio...`)
    const { data: audioBlob, error: storageError } = await supabaseAdmin.storage
      .from('audio-uploads')
      .download(job.storage_path)
    if (storageError) {
      throw new Error(`Error descarregant àudio: ${storageError.message}`)
    }
    const audioFile = new File([audioBlob], 'audio.mp3', {
      type: audioBlob.type,
    })

    // 2. Transcriure (Diarització)
    console.log(`[processJob ${job.id}] Iniciant transcripció Whisper...`)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      // Habilitar diarització (si l'API ho suporta directament en el futur)
      // Per ara, 'verbose_json' ens pot donar segments o paraules amb 'speaker'
    })

    // Construïm el text del diàleg amb labels (Speaker A, Speaker B)
    type TranscriptionWord = {
      word: string
      speaker?: string
      speaker_label?: string
      [key: string]: unknown
    }

    const diarizedText =
      Array.isArray(transcription.words)
        ? ((transcription.words as unknown) as TranscriptionWord[])
          .map((word) => {
            const speakerLabel = word.speaker ?? word.speaker_label ?? 'Unknown'
            return `[Speaker ${speakerLabel}] ${word.word}`
          })
          .join(' ')
        : ''

    const transcriptionText =
      diarizedText.length > 0 ? diarizedText : transcription.text

    // 3. Enriquir Participants (sense canvis)
    console.log(`[processJob ${job.id}] Enriquint participants...`)
    let enrichedParticipants: EnrichedParticipant[] = job.participants || []
    if (job.participants && job.participants.length > 0) {
      const contactIds = job.participants
        .map((p) => p.contact_id)
        .filter((id) => id != null)
      if (contactIds.length > 0) {
        const { data: contactsData, error: contactsError } = await supabaseAdmin
          .from('contacts')
          .select('id, industry, gender') // Afegim 'gender' (home/dona)
          .in('id', contactIds)
        if (!contactsError && contactsData) {
          const contactMap = new Map(
            contactsData.map(
              (c: {
                id: number
                industry: string | null
                gender: string | null
              }) => [
                c.id,
                { industry: c.industry, gender: c.gender },
              ]
            )
          )
          enrichedParticipants = job.participants.map((p) => ({
            ...p,
            industry:
              (contactMap.get(p.contact_id) as {
                industry: string | null
                gender: string | null
              } | undefined)?.industry ?? null,
            gender:
              (contactMap.get(p.contact_id) as {
                industry: string | null
                gender: string | null
              } | undefined)?.gender ?? null,
          }))
        }
      }
    }
    const participantsList = enrichedParticipants
      .map((p) => {
        const details = [p.role, p.industry, p.gender].filter(Boolean).join(', ')
        return `- ${p.name}${details ? ` (Info: ${details})` : ''}`
      })
      .join('\n')

    // 4. Prompt Millorat
    const analysisPrompt = `
Ets un assistent expert en reunions de negocis i projectes.
Has d'analitzar una transcripció que inclou ETIQUETES DE PARLANT (ex: "[Speaker A]").
El teu objectiu és identificar qui és cada parlant i estructurar la conversa.

PARTICIPANTS CONEGUTS (La teva "llegenda"):
${participantsList.length > 0 ? participantsList : "No s'han proporcionat."}

TRANSCRIPCIÓ AMB ETIQUETES:
"${transcriptionText}"

---
TASQUES A REALITZAR (Respon NOMÉS en format JSON):

1.  **summary (string):** Escriu un resum de la reunió, tingues en compte de no resumir massa..
2.  **speaker_identification (array):** Identifica a qui correspon cada etiqueta de parlant (ex: "Speaker A"). Basa't en el context, el rol, el gènere (si es dóna) i el nom.
    * Si no pots identificar un parlant, utilitza el seu label (ex: "Speaker A").
3.  **dialogue_flow (array):** Converteix la transcripció en un diàleg pas a pas, utilitzant els noms identificats. Agrupa les frases consecutives del mateix parlant.
4.  **key_moments (array):** Extreu els moments clau. Un moment clau és un tema de discussió significatiu.
    * **NO incloguis xerrameca** (salutacions, converses personals).
    * Per a cada moment, detalla el tema, un resum, les decisions preses, les accions esmentades (tasques) i qui va participar.
5.  **assigned_tasks_summary (array):** AQUESTA ÉS LA NOVA TASCA.
    * Analitza el diàleg i els moments clau.
    * Crea una llista d'objectes, agrupant TOTES les tasques accionables per la persona a qui s'han assignat (utilitzant el 'identified_name').
    * Les tasques han de ser clares i concises.
    * FORMAT DE SORTIDA JSON OBLIGATORI:
{
  "summary": "Resum executiu...",
  "speaker_identification": [
    {
      "speaker_label": "Speaker A",
      "identified_name": "Marta Ribot",
      "role": "Arquitecta (Client)",
      "reasoning": "Esmenta 'els meus plànols' i el seu rol és 'Arquitecta'."
    },
    {
      "speaker_label": "Speaker B",
      "identified_name": "Josep (Industrial)",
      "role": "Industrial",
      "reasoning": "Parla de 'acer corten' i 'humitat per capil·laritat'."
    }
  ],
  "dialogue_flow": [
    { "speaker_name": "Marta Ribot", "text": "Bon dia, Josep. Comencem amb el tema del terra?" },
    { "speaker_name": "Josep (Industrial)", "text": "Perfecte. He revisat la mostra de microciment i crec que..." }
  ],
  "key_moments": [
    {
      "topic": "Elecció del Paviment",
      "summary": "Es debat entre microciment i parquet. El client (Marta) prefereix microciment pel manteniment.",
      "decisions": ["S'utilitzarà microciment acabat setinat."],
      "action_items": ["Josep ha de demanar mostres de color del microciment.", "Marta ha de confirmar el color abans de divendres."],
      "participants_involved": ["Marta Ribot", "Josep (Industrial)"]
    }
  ],
    "assigned_tasks_summary": [
    {
      "assignee_name": "Marta Ribot",
      "tasks": [
        "Confirmar el color del microciment abans de divendres.",
        "Revisar els plànols de la cuina."
      ]
    },
    {
      "assignee_name": "Josep (Industrial)",
      "tasks": [
        "Demanar mostres de color del microciment."
      ]
    },
    {
      "assignee_name": "Speaker C (Lampista)",
      "tasks": [
        "Portar el nou catàleg de llums LED."
      ]
    }
  ]
}
    `

    // 5. Cridar a OpenAI
    console.log(`[processJob ${job.id}] Cridant a GPT-4o per anàlisi...`)
    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o', // Model potent necessari per a aquesta tasca
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    })

    // 6. Processar resposta
    const content = analysis.choices[0].message.content
    if (!content) throw new Error("La resposta d'OpenAI no té contingut.")

    const resultJson = JSON.parse(content)
    const summary: string = resultJson.summary
    const speakerIdentification: SpeakerIdentity[] =
      resultJson.speaker_identification
    const dialogueFlow: DialogueEntry[] = resultJson.dialogue_flow
    const keyMoments: KeyMoment[] = resultJson.key_moments
    const assignedTasksSummary: AssignedTaskSummary[] =
      resultJson.assigned_tasks_summary

    // 7. Actualitzar la feina a la BBDD
    console.log(`[processJob ${job.id}] Anàlisi completada. Actualitzant BBDD...`)
    await supabaseAdmin
      .from('audio_jobs')
      .update({
        status: 'completed',
        transcription_text: transcription.text, // Guardem text original per si de cas
        summary: summary,
        key_moments: keyMoments as KeyMoment[],
        speaker_identification: speakerIdentification as SpeakerIdentity[],
        dialogue_flow: dialogueFlow as DialogueEntry[],
        assigned_tasks_summary: assignedTasksSummary as AssignedTaskSummary[],
      })
      .eq('id', job.id)

    // ✅ 8. ESBORRAR L'ÀUDIO DE L'STORAGE (OPTIMITZACIÓ)
    // Un cop la transcripció s'ha desat correctament, esborrem el fitxer
    // d'àudio per estalviar espai, ja que no el tornarem a necessitar.
    console.log(`[processJob ${job.id}] Feina desada. Esborrant àudio...`)
    const { error: storageErrorDelete } = await supabaseAdmin.storage
      .from('audio-uploads') // El mateix bucket des d'on hem descarregat
      .remove([job.storage_path]) // El path de l'arxiu

    if (storageErrorDelete) {
      // Això NO és un error fatal. La transcripció està desada.
      // Només ho registrem per saber que no s'ha pogut netejar.
      console.warn(
        `[processJob ${job.id}] Feina completada, 
         però error en esborrar l'àudio ${job.storage_path}:`,
        storageErrorDelete.message
      )
    }
    console.log(`[processJob ${job.id}] Procés finalitzat amb èxit.`)
    
  } catch (err: unknown) {
    // 9. Gestió d'errors (sense canvis)
    let errorMessage = `Error processant la feina ${job.id}.`
    if (err instanceof Error) {
      errorMessage = err.message
    }
    console.error(`Error processant la feina ${job.id}:`, errorMessage)
    await supabaseAdmin
      .from('audio_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', job.id)
  }
}