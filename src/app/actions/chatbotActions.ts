"use server";

import { createClient } from "@/lib/supabase/server";

interface DocumentMatch {
  id: number;
  metadata: Record<string, unknown>;
  embedding: number[]; // Tipus ajustat per reflectir la resposta de l'API
  content: string;
}

export async function chatbotAction(question: string): Promise<{ data: string | null, error: string | null }> {
  if (!process.env.GEMINI_API_KEY) {
    return { data: null, error: "La clau de l'API de Gemini no està configurada." };
  }

  try {
    // 🔹 1. Recuperem documents similars de Supabase
    const supabase = createClient();

    const { data: matches, error: dbError } = await supabase.rpc("match_documents", {
      query_embedding: await embedQuestion(question),
      match_threshold: 0.7,
      match_count: 3,
    });

    if (dbError) throw dbError;

    console.log("[Chatbot] Documents trobats:", matches?.length);

    const context = matches?.map((doc: DocumentMatch) => doc.content).join("\n\n") || "";
    console.log("[Chatbot] Context generat:", context);

    // 🔹 2. Preparem el prompt per a Gemini
    const prompt = `
      Ets un assistent útil.
      Pregunta de l'usuari: "${question}"
      Context de la base de dades:
      ${context}
      Respon en català, de manera clara i concisa.
    `;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    // 🔹 3. Cridem Gemini directament via fetch
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) throw new Error("Error de l'API de Gemini");

    const result = await response.json();
    const answer: string = result.candidates[0].content.parts[0].text;

    return { data: answer, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("Error al chatbot:", message);
    return { data: null, error: message };
  }
}

async function embedQuestion(question: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: question,
    }),
  });

  if (!response.ok) throw new Error("Error generant embedding amb OpenAI");
  const data = await response.json();
  return data.data[0].embedding;
}
