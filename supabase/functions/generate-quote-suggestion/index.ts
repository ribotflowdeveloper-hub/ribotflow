// Aquesta Edge Function s'executa als servidors de Supabase, a prop de l'usuari, per a una resposta ràpida.
// Fa servir Deno com a entorn d'execució.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// Capçaleres CORS per permetre que la nostra aplicació web pugui cridar aquesta funció des del navegador.
const corsHeaders = { /* ... */ };

/**
 * Aquesta funció actua com un assistent d'IA per suggerir conceptes per a un pressupost.
 * Rep un títol i una llista de productes, construeix un 'prompt' per a un model de llenguatge (Gemini),
 * i retorna els conceptes suggerits en format JSON.
 */
serve(async (req) => {
  // Gestió de la petició pre-vol (preflight) per a CORS, necessària per a les crides des del navegador.
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
  
  // Envolcallem tota la lògica en un bloc 'try...catch' per a una gestió d'errors robusta.
  try {
    // Extraiem les dades (el títol del pressupost i la llista de productes) del cos de la petició.
    const { title, products } = await req.json();
    
    // Creem un client de Supabase utilitzant el token d'autenticació de l'usuari
    // que ve a la capçalera de la petició. Això ens permet verificar qui fa la crida.
    const supabase = createClient(/* ... */);
    
    // Verifiquem que l'usuari que fa la crida estigui realment autenticat.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuari no autenticat");

    // Convertim l'array de productes en una llista de text pla per incloure-la al prompt de la IA.
    const productList = products.map(p => `- ${p.name}: ${p.description || ''} (Preu: ${p.default_price}€)`).join('\n');

    // Aquest és el 'prompt': el conjunt d'instruccions que donem al model d'IA.
    // És molt detallat per assegurar que la resposta sigui consistent i en el format JSON exacte que necessitem.
    const prompt = `
      Ets un assistent expert en crear pressupostos. Un usuari vol crear un pressupost titulat "${title}".
      Aquest és el seu catàleg de productes i serveis:
      ${productList}
      
      Suggereix entre 2 i 4 línies de pressupost rellevants per a "${title}".
      Retorna una resposta en format JSON amb una única clau "items", que sigui un array d'objectes.
      Cada objecte ha de tenir les claus: "description" (TEXT), "quantity" (NUMBER), i "unit_price" (NUMBER).
      Basa't només en els productes proporcionats.
    `;

    // Obtenim la clau de l'API de Gemini des de les variables d'entorn segures de Supabase.
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    // Fem la crida a l'API de Gemini amb el nostre prompt.
    const response = await fetch(/* ... crida a l'API de Gemini amb el prompt ... */);
    
    // ... (Aquí aniria la lògica per comprovar si la resposta de l'API és correcta) ...

    // Processem la resposta de la IA per extreure només el text JSON, eliminant marcadors addicionals.
    const aiResponse = JSON.parse(rawText.replace(/```json|```/g, ''));
    
    // Retornem la resposta JSON final al client.
    return new Response(JSON.stringify(aiResponse), { /* ... */ });
  } catch (error) { /* ... (Gestió d'errors) */ }
});