// src/lib/services/crm/quotes/quote-editor.service.ts
import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database} from '@/types/supabase';
import { type ActionResult } from '@/types/shared/index';

// Importem tots els tipus necessaris des del fitxer centralitzat
import {
  type QuotePayload,
  type QuoteEditorDataPayload,
  type QuoteDetailsResponse,
  type NewQuote,
  type InitialQuoteType,
  type Team,
  type Product,
  type Quote,
  type QuoteItem,
 
} from '@/types/finances/quotes'; // Assegura't que la ruta és correcta

/**
 * SERVEI: Obté totes les dades necessàries per a l'editor de pressupostos.
 * Combina la lògica de 'new' i 'edit' de QuoteEditorData.tsx
 */
export async function getQuoteEditorData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  userId: string,
  quoteId: string | 'new'
): Promise<{ data: QuoteEditorDataPayload | null; error: string | null }> {
  
  try {
    if (quoteId === 'new') {
      // --- LÒGICA PER A UN PRESSUPOST NOU ---
      const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('team_id', teamId),
        supabase.from('products').select('*').eq('is_active', true).eq('team_id', teamId),
        supabase.from('teams').select('*').eq('id', teamId).single(),
        supabase.from('quotes')
          .select('sequence_number')
          .eq('team_id', teamId)
          .order('sequence_number', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const errors = [contactsRes.error, productsRes.error, teamRes.error, lastQuoteRes.error].filter(Boolean);
      if (errors.length > 0) {
        console.error("Error en carregar les dades per a un nou pressupost (service):", errors);
        throw new Error("Error en carregar les dades de l'editor.");
      }

      // Lògica de negoci (càlcul del número de pressupost)
      const lastSequence = lastQuoteRes.data?.sequence_number || 0;
      const nextSequence = lastSequence + 1;
      const year = new Date().getFullYear();
      const formattedQuoteNumber = `PRE-${year}-${String(nextSequence).padStart(4, '0')}`;
      
      const initialQuote: NewQuote = {
        id: 'new',
        team_id: teamId,
        user_id: userId,
        contact_id: null,
        opportunity_id: null,
        quote_number: formattedQuoteNumber,
        sequence_number: nextSequence,
        issue_date: new Date().toISOString().slice(0, 10),
        expiry_date: null,
        status: 'Draft',
        notes: 'Gràcies pel vostre interès en els nostres serveis.',
        subtotal: 0,
        discount: 0,
        tax: 0,
        tax_percent: 21,
        total: 0,
        show_quantity: true,
        created_at: new Date().toISOString(),
        sent_at: null,
        rejection_reason: null,
        send_at: null,
        theme_color: null,
        secure_id: crypto.randomUUID(),
        items: [{
          description: '',
          quantity: 1,
          unit_price: 0
        }]
      };

      const payload: QuoteEditorDataPayload = {
        initialQuote: initialQuote as InitialQuoteType,
        contacts: contactsRes.data || [],
        products: productsRes.data || [],
        companyProfile: teamRes.data as Team | null,
        initialOpportunities: [],
        pdfUrl: null // No hi ha PDF per a un pressupost nou
      };
      return { data: payload, error: null };

    } else {
      // --- LÒGICA PER A EDITAR UN PRESSUPOST EXISTENT ---
      const numericQuoteId = Number(quoteId);
      const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('team_id', teamId),
        supabase.from('products').select('*').eq('is_active', true).eq('team_id', teamId),
        supabase.from('teams').select('*').eq('id', teamId).single(),
        supabase.rpc('get_quote_details', { p_quote_id: numericQuoteId }).single<QuoteDetailsResponse>()
      ]);

      const errors = [contactsRes.error, productsRes.error, teamRes.error, quoteDetailsRes.error].filter(Boolean);
      if (errors.length > 0) {
        console.error("Error en carregar les dades d'un pressupost existent (service):", errors);
        throw new Error("Error en carregar les dades de l'editor.");
      }
      
      const quoteDetails = quoteDetailsRes.data;
      if (!quoteDetails?.quote) {
        return { data: null, error: "Pressupost no trobat." };
      }

      // Lògica per generar la URL signada del PDF
      let pdfUrl: string | null = null;
      const filePath = `quotes/${teamId}/${quoteId}.pdf`; 
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('fitxers-privats')
        .createSignedUrl(filePath, 60 * 5); // 5 minuts

      if (signedUrlError) {
        console.warn(`No s'ha pogut generar la URL signada per a ${filePath} (service): ${signedUrlError.message}`);
      } else {
        pdfUrl = signedUrlData.signedUrl;
      }

      const payload: QuoteEditorDataPayload = {
        initialQuote: quoteDetails.quote as (Quote & { items: QuoteItem[] }),
        contacts: contactsRes.data || [],
        products: productsRes.data || [],
        companyProfile: teamRes.data as Team | null,
        initialOpportunities: quoteDetails.opportunities || [],
        pdfUrl: pdfUrl
      };
      return { data: payload, error: null };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut al carregar les dades de l'editor.";
    console.error("Error a getQuoteEditorData (service):", message);
    return { data: null, error: message };
  }
}

/**
 * SERVEI: Desa (crea o actualitza) un pressupost i els seus conceptes.
 * Conté la validació de negoci que hi havia a l'acció.
 */
export async function saveQuote(
  supabase: SupabaseClient<Database>,
  quoteData: QuotePayload,
  teamId: string
): Promise<ActionResult<number>> {
  
  // 1. Validació de dades
  if (!quoteData.contact_id) {
    return { success: false, message: "Cal seleccionar un client." };
  }
  // Si és un pressupost nou, assegurem que tingui el team_id de la sessió
  if (quoteData.id === "new") {
    quoteData.team_id = teamId;
  }
  if (!quoteData.team_id) {
    return { success: false, message: "El pressupost no està assignat a cap equip." };
  }
  if (quoteData.items.length === 0) {
    return { success: false, message: "El pressupost ha de tenir almenys un concepte." };
  }
  const hasInvalidItem = quoteData.items.some(
    (item) => !item.description?.trim() || (item.quantity ?? 1) <= 0,
  );
  if (hasInvalidItem) {
    return { success: false, message: "Un o més conceptes tenen dades invàlides (descripció buida o quantitat 0)." };
  }
  
  // 2. Crida a la BD
  try {
    const { data, error } = await supabase.rpc("upsert_quote_with_items", {
      quote_payload: quoteData as QuotePayload,
    });

    if (error) {
      console.error("Supabase RPC Error (service):", JSON.stringify(error, null, 2));
      throw new Error(error.message || "Error a la funció RPC 'upsert_quote_with_items'");
    }

    const finalQuoteId = (data as { quote_id: number }).quote_id;
    return { success: true, message: "Pressupost desat.", data: finalQuoteId };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut al desar el pressupost.";
    console.error("Error a saveQuote (service):", message);
    if (message.includes("constraint")) {
       return { success: false, message: "Error de dades. Assegura't que tots els camps obligatoris estan omplerts." };
    }
    return { success: false, message };
  }
}

/**
 * SERVEI: Esborra un pressupost i els seus items.
 */
export async function deleteQuote(
  supabase: SupabaseClient<Database>,
  quoteId: number
): Promise<{ error: PostgrestError | null }> {
  
  const { error: itemsError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);

  if (itemsError) {
    console.error("Error deleting quote items (service):", itemsError);
    return { error: itemsError };
  }

  const { error: quoteError } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId);
  
  if (quoteError) {
    console.error("Error deleting quote (service):", quoteError);
    return { error: quoteError };
  }

  return { error: null };
}

/**
 * SERVEI: Crea un nou producte.
 */
export async function createProduct(
  supabase: SupabaseClient<Database>,
  newProduct: { name: string; price: number },
  userId: string,
  teamId: string
): Promise<ActionResult<Product>> {
  try {
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id: userId,
        team_id: teamId,
        name: newProduct.name,
        price: newProduct.price,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: "Nou producte desat.", data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error en crear el producte.";
    return { success: false, message };
  }
}

/**
 * SERVEI: Invoca l'Edge Function per enviar el pressupost.
 */
export async function sendQuote(
  supabase: SupabaseClient<Database>,
  quoteId: number
): Promise<ActionResult> {
  try {
    const { error } = await supabase.functions.invoke("send-quote-pdf", {
      body: { quoteId },
    });
    if (error) throw error;
    return { success: true, message: "S'ha iniciat l'enviament." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error en invocar l'Edge Function.";
    return { success: false, message };
  }
}

/**
 * SERVEI: Actualitza el perfil de l'equip.
 */
export async function updateTeamProfile(
  supabase: SupabaseClient<Database>,
  teamData: Partial<Team>,
  teamId: string
): Promise<ActionResult<Team>> {
  try {
    const { data, error } = await supabase
      .from("teams")
      .update(teamData)
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: "Perfil actualitzat.", data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error en actualitzar el perfil.";
    return { success: false, message };
  }
}