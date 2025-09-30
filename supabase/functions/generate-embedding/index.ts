import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

// ✅ CORRECCIÓ CLAU: Aquestes línies configuren la llibreria per a que funcioni
// correctament dins de l'entorn limitat d'una Edge Function.
env.allowLocalModels = false;
env.useBrowserCache = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Carreguem el model una sola vegada per a reutilitzar-lo en múltiples invocacions.
const embeddingGenerator = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text) throw new Error("Falta el paràmetre 'text'.");

    const output = await embeddingGenerator(text, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = Array.from(output.data);

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});