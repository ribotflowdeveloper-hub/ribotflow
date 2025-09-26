import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

// --- CONFIGURACIÓ ---
// Assegura't que aquestes variables estiguin al teu fitxer .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Important: Fes servir la Service Role Key
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    throw new Error("Supabase URL, Service Key, or OpenAI API Key is missing from .env file.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });


// --- FUNCIÓ PRINCIPAL ---

async function main() {
    console.log("Iniciant el procés d'indexació de documents...");

    // 1. Esborrem les dades antigues per a evitar duplicats
    await supabase.from('documents').delete().neq('id', 0);
    console.log("Taula 'documents' netejada.");

    // 2. Trobem tots els fitxers de codi rellevants a la carpeta 'app'
    const filePaths = await glob('app/**/*.{ts,tsx}', {
        ignore: ['node_modules/**', '**/*.d.ts'], // Ignorem fitxers que no volem indexar
    });
    console.log(`S'han trobat ${filePaths.length} fitxers per a processar.`);

    for (const filePath of filePaths) {
        try {
            console.log(`Processant fitxer: ${filePath}...`);
            const content = await fs.readFile(filePath, 'utf-8');

            // Aquí podries dividir el 'content' en trossos més petits si els fitxers són molt grans.
            // Per a aquest exemple, indexarem el contingut complet de cada fitxer.
            
            // 3. Generem l'embedding per al contingut del fitxer
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small', // Model d'embeddings recomanat
                input: content,
            });

            const embedding = embeddingResponse.data[0].embedding;

            // 4. Inserim les dades a la taula 'documents' de Supabase
            const { error } = await supabase.from('documents').insert({
                content: content,
                source: filePath,
                embedding: embedding,
            });

            if (error) {
                console.error(`Error en inserir les dades per a ${filePath}:`, error.message);
            } else {
                console.log(`✅ Fitxer ${filePath} indexat correctament.`);
            }

        } catch (err) {
            console.error(`Error en processar el fitxer ${filePath}:`, err);
        }
    }

    console.log("\nProcés d'indexació finalitzat amb èxit!");
}

main();