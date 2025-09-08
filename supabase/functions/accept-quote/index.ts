// fitxer: supabase/functions/accept-quote/index.ts

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
    const { secureId } = await req.json();
    if (!secureId) throw new Error("Falta el secureId.");

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- PAS 1: Actualitzem el pressupost i recuperem les seves dades ---
    const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .update({ status: 'Accepted' })
        .eq('secure_id', secureId)
        .select()
        .single();

    if (quoteError) throw new Error(`Error al PAS 1 (actualitzar pressupost): ${quoteError.message}`);

    // --- PAS 2: Actualitzem l'oportunitat associada ---
    if (quote.opportunity_id) {
        const { error: opportunityError } = await supabaseAdmin
            .from('opportunities')
            .update({ stage_name: 'Guanyat' }) // Utilitzem 'stage_name' que és la columna correcta
            .eq('id', quote.opportunity_id);

        if (opportunityError) throw new Error(`Error al PAS 2 (actualitzar oportunitat): ${opportunityError.message}`);
    }

    // --- PAS 3: Creem l'esborrany de la factura ---
    const { error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
            user_id: quote.user_id,
            contact_id: quote.contact_id,
            quote_id: quote.id,
            status: 'Draft',
            total: quote.total,
            subtotal: quote.subtotal,
            tax: quote.tax,
            discount: quote.discount,
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().slice(0, 10),
        });

    if (invoiceError) throw new Error(`Error al PAS 3 (crear factura): ${invoiceError.message}`);
    
    return new Response(JSON.stringify({ message: `Flux completat per al pressupost ${quote.id}!` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error("[accept-quote] ERROR FATAL:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
    });
  }
});