// supabase/functions/send-quote-pdf/_lib/supabaseUpdater.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { type Quote } from "./types.ts";

/**
 * Actualitza l'estat del pressupost a 'Sent' i l'estat de l'oportunitat relacionada.
 */
export async function updateDatabaseStatus(supabaseAdmin: SupabaseClient, quote: Quote): Promise<void> {
  // Actualitzar estat del pressupost
  console.log(`Updating quote ${quote.id} status to 'Sent'.`);
  const { error: updateQuoteError } = await supabaseAdmin
    .from('quotes')
    .update({
      status: 'Sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', quote.id);
    
  if (updateQuoteError) {
    // Només advertim, ja que l'email s'ha enviat
    console.warn(`Warning: Failed to update quote status after sending: ${updateQuoteError.message}`);
  }

  // Actualitzar estat de l'oportunitat (si n'hi ha)
  if (quote.opportunity_id) {
    console.log(`Updating opportunity ${quote.opportunity_id} stage.`);
    const { error: updateOppError } = await supabaseAdmin
      .from('opportunities')
      .update({ stage_name: 'Proposta Enviada' }) // Assegura't que aquest nom coincideix
      .eq('id', quote.opportunity_id);
      
    if (updateOppError) {
       console.warn(`Warning: Failed to update opportunity stage: ${updateOppError.message}`);
    }
  }
}