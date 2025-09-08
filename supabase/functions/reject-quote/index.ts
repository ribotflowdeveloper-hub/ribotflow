// fitxer: supabase/functions/reject-quote/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { secureId, reason } = await req.json();
    if (!secureId) throw new Error("Falta el secureId del pressupost.");
    if (!reason) throw new Error("Falta el motiu del rebuig.");

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- PAS 1: Trobem el pressupost per obtenir totes les seves dades ---
    const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .select('id, user_id, contact_id, opportunity_id') // Només necessitem els IDs
        .eq('secure_id', secureId)
        .single();

    if (quoteError) throw new Error(`No s'ha pogut trobar el pressupost: ${quoteError.message}`);

    // --- PAS 2: Actualitzem el pressupost a 'Declined' (sense tocar les notes) ---
    const { error: updateQuoteError } = await supabaseAdmin
        .from('quotes')
        .update({ status: 'Declined' })
        .eq('id', quote.id);

    if (updateQuoteError) throw new Error(`Error en actualitzar l'estat del pressupost: ${updateQuoteError.message}`);

    // --- PAS 3: Movem l'oportunitat a 'Negociació' ---
    if (quote.opportunity_id) {
        const { error: opportunityError } = await supabaseAdmin
            .from('opportunities')
            .update({ stage_name: 'Negociació' })
            .eq('id', quote.opportunity_id);

        if (opportunityError) throw new Error(`Error en actualitzar l'oportunitat: ${opportunityError.message}`);
    }
    
    // --- NOU PAS 4: Creem una nova entrada a la taula 'activities' ---
    const { error: activityError } = await supabaseAdmin
        .from('activities')
        .insert({
            user_id: quote.user_id,
            contact_id: quote.contact_id,
            quote_id: quote.id,
            opportunity_id: quote.opportunity_id,
            type: 'Rebuig de Pressupost',
            content: reason,
            is_read: false // Es marca com a no llegida per a que aparegui com a alerta
        });

    if (activityError) throw new Error(`Error en crear l'activitat: ${activityError.message}`);

    return new Response(JSON.stringify({ message: "El rebuig del pressupost s'ha processat correctament." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error("[reject-quote] ERROR FATAL:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
    });
  }
});