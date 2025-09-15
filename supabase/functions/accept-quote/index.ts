/**
 * @file index.ts (accept-quote)
 * @summary Aquesta és una Supabase Edge Function escrita en Deno/TypeScript.
 * La seva funció és gestionar tota la lògica de negoci que s'ha d'executar de manera
 * segura al servidor quan un client accepta un pressupost a través de la seva URL única.
 * Aquesta funció automatitza un flux de treball complet en tres passos.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";

// Capçaleres CORS per permetre que la funció sigui cridada des de qualsevol origen
// (normalment, el navegador del client que visita la pàgina pública del pressupost).
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
    // Creem un client de Supabase amb privilegis d'administrador (SERVICE_ROLE_KEY).
    // Això és crucial perquè aquesta funció ha de poder modificar dades (quotes, opportunities, invoices)
    // sense estar limitada per les polítiques de seguretat a nivell de fila (RLS) de l'usuari.
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

      // --- PAS 3: Creem un ESBORRANY de factura automàticament ---
    // Aquest és el punt d'inici del flux de facturació. L'usuari haurà d'emetre-la legalment des de la plataforma.
    const { error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
            user_id: quote.user_id,
            contact_id: quote.contact_id,
            quote_id: quote.id,
            status: 'Draft', // Sempre es crea com a esborrany, mai com a factura emesa directament.
            total_amount: quote.total, // Utilitzem el nom de columna correcte.
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