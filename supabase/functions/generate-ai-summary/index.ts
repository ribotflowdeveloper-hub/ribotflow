import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Assegura't de definir aquesta variable d'entorn al teu projecte de Supabase
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Autentiquem l'usuari a través del seu token
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Usuari no trobat.");

    // 1. Recollim les dades clau de l'usuari
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('title')
      .eq('user_id', user.id)
      .eq('is_completed', false);

    const { data: overdueInvoices } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['Sent', 'Overdue'])
      .lt('due_date', new Date().toISOString());

    const pendingTasksCount = tasks?.length || 0;
    const overdueInvoicesCount = overdueInvoices?.length || 0;
    
    // 2. Construïm un prompt detallat per a Gemini
    const prompt = `
      Ets "Ribot", un assistent d'IA per a autònoms. Analitza les següents dades d'un usuari i genera una resposta en format JSON amb dues claus: "summary" i "suggestion".
      - "summary": Un resum molt breu i directe de la situació actual.
      - "suggestion": Un consell accionable o una observació interessant. Si no hi ha res destacable, dóna un consell general de productivitat.
      
      Dades de l'usuari:
      - Tasques pendents: ${pendingTasksCount}
      - Factures vençudes: ${overdueInvoicesCount}
    `;
    
    // 3. Truquem a l'API de Gemini
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Error de l'API de Gemini: ${await response.text()}`);

    const result = await response.json();
    const aiResponseText = result.candidates[0].content.parts[0].text;
    const cleanedJson = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiInsights = JSON.parse(cleanedJson);

    // 4. Retornem la resposta de la IA
    return new Response(JSON.stringify(aiInsights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[AI-SUMMARY-ERROR]', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
