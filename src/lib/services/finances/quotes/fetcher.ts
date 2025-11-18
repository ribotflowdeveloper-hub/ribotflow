import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import {
  type InitialQuoteType,
  type NewQuote,
  type Quote,
  type QuoteDetailsResponse,
  type QuoteEditorDataPayload,
  type QuoteItem,
  type Team,
} from "@/types/finances/quotes";
import crypto from "crypto";

/**
 * Obté les dades per inicialitzar l'editor de pressupostos (Nou o Existent).
 */
export async function getQuoteEditorData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  userId: string,
  quoteId: string | "new",
): Promise<{ data: QuoteEditorDataPayload | null; error: string | null }> {
  try {
    if (quoteId === "new") {
      return await _getNewQuoteData(supabase, teamId, userId);
    } else {
      return await _getExistingQuoteData(supabase, teamId, Number(quoteId));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("Error a getQuoteEditorData:", message);
    return { data: null, error: message };
  }
}

// --- Helpers Privats ---

async function _getNewQuoteData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  userId: string
) {
  const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
    supabase.from("contacts").select("*").eq("team_id", teamId),
    supabase.from("products").select("*").eq("is_active", true).eq("team_id", teamId),
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase.from("quotes")
      .select("sequence_number")
      .eq("team_id", teamId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const errors = [contactsRes.error, productsRes.error, teamRes.error, lastQuoteRes.error].filter(Boolean);
  if (errors.length > 0) throw new Error("Error carregant dades inicials.");

  // Càlcul del número de seqüència
  const lastSequence = lastQuoteRes.data?.sequence_number || 0;
  const nextSequence = lastSequence + 1;
  const year = new Date().getFullYear();
  const formattedQuoteNumber = `PRE-${year}-${String(nextSequence).padStart(4, "0")}`;

  const initialQuote: NewQuote = {
    id: "new",
    team_id: teamId,
    user_id: userId,
    contact_id: null,
    opportunity_id: null,
    quote_number: formattedQuoteNumber,
    sequence_number: nextSequence,
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: null,
    status: "Draft",
    notes: "Gràcies pel vostre interès en els nostres serveis.",
    subtotal: 0,
    discount_amount: 0,
    tax_amount: 0,
    legacy_tax_amount: null,
    legacy_tax_rate: null,
    retention_amount: 0,
    total_amount: 0,
    show_quantity: true,
    created_at: new Date().toISOString(),
    sent_at: null,
    rejection_reason: null,
    send_at: null,
    theme_color: null,
    secure_id: crypto.randomUUID(),
    items: [{ description: "", quantity: 1, unit_price: 0 }],
  };

  return {
    data: {
      initialQuote: initialQuote as InitialQuoteType,
      contacts: contactsRes.data || [],
      products: productsRes.data || [],
      companyProfile: teamRes.data as Team | null,
      initialOpportunities: [],
      pdfUrl: null,
    },
    error: null,
  };
}

async function _getExistingQuoteData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  quoteId: number
) {
  const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise.all([
    supabase.from("contacts").select("*").eq("team_id", teamId),
    supabase.from("products").select("*").eq("is_active", true).eq("team_id", teamId),
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase.rpc("get_quote_details", { p_quote_id: quoteId }).single<QuoteDetailsResponse>(),
  ]);

  if (quoteDetailsRes.error) throw new Error("Error carregant el pressupost.");
  
  const quoteDetails = quoteDetailsRes.data;
  if (!quoteDetails?.quote) return { data: null, error: "Pressupost no trobat." };

  // Generar URL signada del PDF si existeix
  let pdfUrl: string | null = null;
  const filePath = `quotes/${teamId}/${quoteId}.pdf`;
  const { data: signedUrlData } = await supabase.storage
    .from("fitxers-privats")
    .createSignedUrl(filePath, 60 * 5);
  
  if (signedUrlData) pdfUrl = signedUrlData.signedUrl;

  return {
    data: {
      initialQuote: quoteDetails.quote as Quote & { items: QuoteItem[] },
      contacts: contactsRes.data || [],
      products: productsRes.data || [],
      companyProfile: teamRes.data as Team | null,
      initialOpportunities: quoteDetails.opportunities || [],
      pdfUrl,
    },
    error: null,
  };
}