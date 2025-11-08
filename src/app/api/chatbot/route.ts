import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const geminiApiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Variables d'entorn no configurades correctament (API Chatbot).",
  );
}

const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// ✅ Model de xat actualitzat
const chatModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash', // exemple de model disponible
});

// ✅ Model d'embeddings (segueix vàlid)
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

export const runtime = "edge";

type ContextChunk = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1]?.content;

    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: "No user message found" }), {
        status: 400,
      });
    }

    // 1️⃣ Generar embedding
    const embeddingResult = await embeddingModel.embedContent(lastUserMessage);
    const queryEmbedding = embeddingResult.embedding.values;

    if (!queryEmbedding) throw new Error("No s'ha pogut generar l'embedding.");

    // 2️⃣ Fer cerca de context a Supabase
    const { data: contextChunks, error: rpcError } = await supabaseClient.rpc(
      "match_platform_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 5,
      },
    );

    if (rpcError) throw new Error(`Error RPC: ${rpcError.message}`);

    const context = contextChunks?.length
      ? contextChunks.map((chunk: ContextChunk) => chunk.content).join(
        "\n---\n",
      )
      : "No s'ha trobat context rellevant.";

    // 3️⃣ Crear prompt
    const prompt = `
Ets "Ribot", l'assistent d'IA de RibotFlow.
Respon només amb la informació del context.
Si no hi és, digues que no ho saps.

CONTEXT:
---
${context}
---

PREGUNTA:
${lastUserMessage}
    `;

    // 4️⃣ Cridar el model i generar resposta
    const result = await chatModel.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // 5️⃣ Convertir el stream de Gemini a text pla
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error a l’API chatbot:", error);
    return new Response(
      JSON.stringify({ error: "Error intern del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
