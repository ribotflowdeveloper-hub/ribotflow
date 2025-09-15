/**
 * @file index.ts (reject-quote)
 * @summary Aquesta és una Supabase Edge Function que gestiona la lògica de negoci
 * quan un client rebutja un pressupost. Automatitza diverses tasques per mantenir
 * les dades del CRM actualitzades.
 */

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
    const { secureId, reason } = await req.json(); // L'ID segur del pressupost i el motiu del rebuig.
    if (!secureId) throw new Error("Falta el secureId del pressupost.");
    if (!reason) throw new Error("Falta el motiu del rebuig.");

    // Creem un client de Supabase amb privilegis d'administrador (SERVICE_ROLE_KEY).
    // Això ens permet modificar dades sense estar limitats per les RLS (Row Level Security).
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- PAS 1: Trobem el pressupost per obtenir els seus IDs relacionats ---
    const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .select('id, user_id, contact_id, opportunity_id') // Només seleccionem les dades que necessitem.
        .eq('secure_id', secureId)
        .single();

    if (quoteError) throw new Error(`No s'ha pogut trobar el pressupost: ${quoteError.message}`);

    // --- PAS 2: Actualitzem l'estat del pressupost a 'Declined' ---
    const { error: updateQuoteError } = await supabaseAdmin
        .from('quotes')
        .update({ status: 'Declined', rejection_reason: reason }) // Guardem també el motiu del rebuig
        .eq('id', quote.id);

    if (updateQuoteError) throw new Error(`Error en actualitzar l'estat del pressupost: ${updateQuoteError.message}`);

    // --- PAS 3: Canviem l'estat de l'oportunitat associada ---
    // En lloc de donar-la per perduda, la movem a 'Negociació' per si l'usuari vol fer una contraoferta.
    if (quote.opportunity_id) {
        await supabaseAdmin
            .from('opportunities')
            .update({ stage_name: 'Negociació' })
            .eq('id', quote.opportunity_id);
    }
    
    // --- PAS 4: Creem un registre a la taula 'activities' ---
    // Això genera una notificació o un registre a l'historial del contacte, informant del rebuig.
    const { error: activityError } = await supabaseAdmin
        .from('activities')
        .insert({
            user_id: quote.user_id,
            contact_id: quote.contact_id,
            quote_id: quote.id,
            opportunity_id: quote.opportunity_id,
            type: 'Rebuig de Pressupost',
            content: reason, // Guardem el motiu del rebuig com a contingut de l'activitat.
            is_read: false // Es marca com a no llegida per a que aparegui com una alerta a la UI.
        });

    if (activityError) throw new Error(`Error en crear l'activitat: ${activityError.message}`);

    return new Response(JSON.stringify({ message: "El rebuig del pressupost s'ha processat correctament." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error("[reject-quote] ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
    });
  }
});
