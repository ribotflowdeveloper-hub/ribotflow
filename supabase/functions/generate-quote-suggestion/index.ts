// supabase/functions/generate-quote-suggestion/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = { /* ... */ };

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
  try {
    const { title, products } = await req.json();
    const supabase = createClient(/* ... */); // Inicialitza el client amb les dades de l'usuari
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    const productList = products.map(p => `- ${p.name}: ${p.description || ''} (Preu: ${p.default_price}€)`).join('\n');

    const prompt = `
      Ets un assistent expert en crear pressupostos. Un usuari vol crear un pressupost titulat "${title}".
      Aquest és el seu catàleg de productes i serveis:
      ${productList}
      
      Suggereix entre 2 i 4 línies de pressupost rellevants per a "${title}".
      Retorna una resposta en format JSON amb una única clau "items", que sigui un array d'objectes.
      Cada objecte ha de tenir les claus: "description" (TEXT), "quantity" (NUMBER), i "unit_price" (NUMBER).
      Basa't només en els productes proporcionats.
    `;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const response = await fetch(/* ... crida a l'API de Gemini amb el prompt ... */);
    
    // ... (lògica per analitzar la resposta de Gemini i retornar el JSON) ...

    const aiResponse = JSON.parse(rawText.replace(/```json|```/g, ''));
    return new Response(JSON.stringify(aiResponse), { /* ... */ });
  } catch (error) { /* ... */ }
});