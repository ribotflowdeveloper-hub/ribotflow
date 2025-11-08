// scripts/generate_embeddings.mjs

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
// CORRECCIÓ 1: Importa el text splitter des del seu paquet correcte
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
// CORRECCIÓ 2: Importa 'Document' des del paquet '@langchain/core'
import { Document } from '@langchain/core/documents'
import { glob } from 'glob'
import { promises as fs } from 'fs'


// Carrega les variables d'entorn
const geminiApiKey = process.env.GEMINI_API_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!geminiApiKey || !supabaseUrl || !supabaseKey) {
  throw new Error(
    'Falten variables dentorn (GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)',
  )
}

// Inicialitza el client de Supabase (Natiu)
const client = createClient(supabaseUrl, supabaseKey)

// Inicialitza el model d'embeddings de Gemini (Natiu)
const genAI = new GoogleGenerativeAI(geminiApiKey)
const embeddingModel = genAI.getGenerativeModel({
  model: 'text-embedding-004',
})

// Funció principal del script
async function run() {
  try {
    console.log("Iniciant el procés de generació d'embeddings (Mode Natiu)...")

    // 1. Carregar documents des de la carpeta 'docs'
    console.log('Carregant documents des de la carpeta ./docs ...')
    const docPaths = await glob('docs/**/*.md')
    const allDocs = []

    for (const docPath of docPaths) {
      const content = await fs.readFile(docPath, 'utf-8')
      allDocs.push(
        new Document({
          pageContent: content,
          metadata: { source: docPath },
        }),
      )
    }
    console.log(`Carregats ${allDocs.length} documents.`)

    if (allDocs.length === 0) {
      console.log("No s'han trobat documents a la carpeta /docs. Aturant.")
      return
    }

    // 2. Dividir els documents en trossos (chunks)
    console.log('Dividint documents en chunks...')
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    })
    const chunks = await splitter.splitDocuments(allDocs)
    console.log(`Documents dividits en ${chunks.length} chunks.`)

    // 3. Netejar la taula existent a Supabase
    console.log('Netejant la taula "platform_documents" existent...')
    const { error: deleteError } = await client
      .from('platform_documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('Error netejant la taula:', deleteError.message)
      throw deleteError
    }

    // 4. Generar embeddings (Natiu) i preparar per a la càrrega
    console.log(
      'Generant embeddings manualment amb el SDK de Google (pot trigar)...',
    )

    const documentsToInsert = []
    for (const chunk of chunks) {
      try {
        const embeddingResult = await embeddingModel.embedContent(
          chunk.pageContent,
        )
        const embedding = embeddingResult.embedding.values

        documentsToInsert.push({
          content: chunk.pageContent,
          metadata: chunk.metadata,
          embedding: embedding,
        })
      } catch (err) {
        console.warn(
          `Error generant embedding per al chunk: ${chunk.metadata.source}. Saltant.`,
          err instanceof Error ? err.message : 'Error desconegut',
        )
      }
    }

    console.log(`Generats ${documentsToInsert.length} embeddings.`)

    // 5. Pujar a Supabase en lots (batch)
    if (documentsToInsert.length > 0) {
      console.log('Pujant dades a Supabase...')
      const { error: insertError } = await client
        .from('platform_documents')
        .insert(documentsToInsert)

      if (insertError) {
        console.error('Error pujant dades a Supabase:', insertError.message)
        throw insertError
      }
    }

    console.log('✅ Procés completat! (Mode Natiu)')
  } catch (error) {
    console.error("Error durant la generació d'embeddings:", error)
  }
}

run()