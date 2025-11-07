"use server";

import { createAdminClient } from "@/lib/supabase/admin"; // Canviat a 'admin' ja que 'server' és per a RLS d'usuari
import { z } from "zod";
import type { QuoteDataFromServer } from "@/types/finances/quotes";
import { type Database } from "@/types/supabase";

// --- Tipus de Retorn ---
export type FormState = { success: boolean; message: string };

// --- Esquemes de Validació (Sense canvis) ---
const AcceptQuoteSchema = z.string().uuid(
  "L'identificador del pressupost és invàlid.",
);
const RejectQuoteSchema = z.object({
  secureId: z.string().uuid("L'identificador del pressupost és invàlid."),
  reason: z.string().min(
    10,
    "El motiu del rebuig ha de tenir almenys 10 caràcters.",
  ).max(500, "El motiu és massa llarg."),
});

// Tipus interns
type QuoteWithRelations = Database["public"]["Tables"]["quotes"]["Row"] & {
  contacts: Database["public"]["Tables"]["contacts"]["Row"] | null;
  team: Database["public"]["Tables"]["teams"]["Row"] | null;
};

// ---
// ⚙️ FUNCIÓ DE LECTURA (Sense canvis)
// ---
export async function getPublicQuoteData(
  secureId: string,
): Promise<QuoteDataFromServer | null> {
  const supabaseAdmin = createAdminClient();

  const { data: quoteData, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("*, contacts (*), team:teams (*)")
    .eq("secure_id", secureId)
    .single<QuoteWithRelations>();

  if (quoteError || !quoteData) {
    console.error(
      "Error carregant dades del pressupost (Pas 1):",
      quoteError?.message || "Dades no trobades",
    );
    return null;
  }

  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteData.id);

  if (itemsError) {
    console.error(
      "Pressupost trobat, però error en carregar items (Pas 2):",
      itemsError.message,
    );
  }

  const fullData = {
    ...quoteData,
    items: itemsData || [],
  };

  return fullData as unknown as QuoteDataFromServer;
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (Actualitzades)
// ---

/**
 * Funció auxiliar per moure una oportunitat (si existeix)
 */
async function moveOpportunity(
  supabase: ReturnType<typeof createAdminClient>,
  opportunityId: number | null,
  targetStageType: 'WON' | 'LOST', // Tipus d'etapa objectiu
  targetStageName: 'Guanyat' | 'Perdut' // Nom per al camp denormalitzat
) {
  if (!opportunityId) return; // Si no hi ha oportunitat, no fem res

  try {
    // 1. Obtenir el pipeline_id de l'oportunitat
    const { data: oppData, error: oppError } = await supabase
      .from('opportunities')
      .select('pipeline_stage_id, pipeline_stages(pipeline_id)')
      .eq('id', opportunityId)
      .single();

    if (oppError || !oppData || !oppData.pipeline_stages) {
      throw new Error(`Oportunitat ${opportunityId} no trobada o sense pipeline_stage vàlid.`);
    }
    
    const currentPipelineId = Array.isArray(oppData.pipeline_stages) && oppData.pipeline_stages.length > 0
      ? oppData.pipeline_stages[0].pipeline_id
      : null;
    if (!currentPipelineId) {
      throw new Error(`No s'ha trobat pipeline_id per l'oportunitat ${opportunityId}.`);
    }

    // 2. Buscar l'ID de l'etapa "Guanyat" o "Perdut" DINS d'aquest pipeline
    const { data: targetStage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', currentPipelineId)
      .eq('stage_type', targetStageType) // Més robust que buscar per 'name'
      .limit(1)
      .single();

    if (stageError || !targetStage) {
      throw new Error(`No s'ha trobat l'etapa '${targetStageName}' (Tipus: ${targetStageType}) al pipeline ${currentPipelineId}.`);
    }

    // 3. Actualitzar l'oportunitat amb l'ID de l'etapa correcte
    const { error: updateOppError } = await supabase
      .from('opportunities')
      .update({ 
          pipeline_stage_id: targetStage.id,
          stage_name: targetStageName 
      })
      .eq('id', opportunityId);

    if (updateOppError) {
        throw new Error(`No s'ha pogut moure l'oportunitat: ${updateOppError.message}`);
    }

    console.log(`[moveOpportunity] Oportunitat ${opportunityId} moguda a '${targetStageName}' (ID: ${targetStage.id})`);

  } catch (error: unknown) {
    // Registrem l'error, però no fem fallar l'acceptació/rebuig
    console.warn(`[moveOpportunity] Error en moure l'oportunitat ${opportunityId}:`, (error as Error).message);
  }
}


/**
 * SERVEI: Accepta un pressupost, mou l'oportunitat i crea un esborrany de factura.
 * (Lògica de la RPC 'accept_quote_and_create_invoice' moguda a TypeScript)
 */
export async function acceptQuote(secureId: string): Promise<FormState> {
  const validation = AcceptQuoteSchema.safeParse(secureId);
  if (!validation.success) {
    return { success: false, message: validation.error.issues[0].message };
  }

  const supabaseAdmin = createAdminClient();

  try {
    // 1. Obtenir el pressupost i les seves línies
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select("*, items:quote_items(*)")
      .eq("secure_id", secureId)
      .single();

    if (quoteError) throw new Error("El pressupost no existeix o ja no és accessible.");
    if (quote.status !== 'Sent' && quote.status !== 'Draft') {
      return { success: false, message: "Aquest pressupost ja ha estat processat (acceptat o rebutjat)." };
    }

    // 2. Actualitzar el pressupost a 'Accepted'
    const { error: updateQuoteError } = await supabaseAdmin
      .from("quotes")
      .update({ status: "Accepted", accepted_at: new Date().toISOString() })
      .eq("id", quote.id)
      .select() // Retornem la fila actualitzada
      .single();
    
    if (updateQuoteError) throw new Error("Error en actualitzar l'estat del pressupost.");

    // 3. Moure l'Oportunitat a "Guanyat" (La nova lògica)
    await moveOpportunity(supabaseAdmin, quote.opportunity_id, 'WON', 'Guanyat');

    // 4. Crear l'esborrany de la factura (Lògica de la RPC)
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        team_id: quote.team_id,
        user_id: quote.user_id,
        contact_id: quote.contact_id,
        quote_id: quote.id,
        status: "Draft",
        issue_date: new Date().toISOString(),
        subtotal: quote.subtotal,
        discount_amount: quote.discount,
        tax_amount: quote.tax,
        tax_rate: quote.tax_percent,
        total_amount: quote.total,
        notes: quote.notes,
        // (Afegim camps addicionals si cal)
      })
      .select("id")
      .single();

    if (invoiceError) throw new Error("Error en crear l'esborrany de la factura.");

    // 5. Vincular la factura al pressupost
    await supabaseAdmin
      .from("quotes")
      .update({ invoice_id: invoice.id })
      .eq("id", quote.id);
      
    // 6. Copiar les línies (items)
    interface QuoteItem {
      team_id: number | null;
      user_id: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      product_id: number | null;
    }

    interface InvoiceItemInsert {
      invoice_id: number;
      team_id: number | null;
      user_id: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      product_id: number | null;
    }

    const itemsToInsert: InvoiceItemInsert[] = (quote.items as QuoteItem[]).map((item: QuoteItem): InvoiceItemInsert => ({
      invoice_id: invoice.id,
      team_id: item.team_id,
      user_id: item.user_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      product_id: item.product_id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("invoice_items")
      .insert(itemsToInsert);

    if (itemsError) throw new Error("Error en copiar les línies a la factura.");

    return {
      success: true,
      message: "Pressupost acceptat i esborrany de factura creat correctament.",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("[acceptQuote Service] Error:", message); 
    return { success: false, message };
  }
}

/**
 * SERVEI: Rebutja un pressupost i mou l'oportunitat a "Perdut".
 * (Lògica de la RPC 'reject_quote_with_reason' moguda a TypeScript)
 */
export async function rejectQuote(
  secureId: string,
  reason: string,
): Promise<FormState> {
  const validation = RejectQuoteSchema.safeParse({ secureId, reason });
  if (!validation.success) {
    return { success: false, message: validation.error.issues[0].message };
  }

  const supabaseAdmin = createAdminClient();

  try {
    // 1. Obtenir el pressupost
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select("id, status, opportunity_id")
      .eq("secure_id", secureId)
      .single();

    if (quoteError) throw new Error("El pressupost no existeix o ja no és accessible.");
    if (quote.status !== 'Sent' && quote.status !== 'Draft') {
      return { success: false, message: "Aquest pressupost ja ha estat processat (acceptat o rebutjat)." };
    }

    // 2. Actualitzar el pressupost a 'Declined'
    const { error: updateQuoteError } = await supabaseAdmin
      .from("quotes")
      .update({
        status: "Declined",
        rejection_reason: reason,
      })
      .eq("id", quote.id);

    if (updateQuoteError) throw new Error("Error en actualitzar l'estat del pressupost.");

    // 3. Moure l'Oportunitat a "Perdut" (La nova lògica)
    await moveOpportunity(supabaseAdmin, quote.opportunity_id, 'LOST', 'Perdut');

    return { success: true, message: "El rebuig s'ha processat correctament." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("[rejectQuote Service] Error:", message); 
    return { success: false, message };
  }
}