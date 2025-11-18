import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type ActionResult } from "@/types/shared/index";
import { type Team, type Quote, type QuoteItem, type Opportunity, type EditableQuote } from "@/types/finances/quotes";
import { generateQuotePdfBuffer } from "@/lib/pdf/generateQuotePDF";
import { decryptToken } from "@/lib/utils/crypto";
import { Base64 } from "js-base64";
import crypto from "crypto";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

// ✅ 1. Definim el tipus de resposta que ens torna l'RPC
type QuoteDetailsResponse = {
  quote: Quote & { items: QuoteItem[] };
  opportunities: Opportunity[];
};

/**
 * SERVEI PRINCIPAL: Envia el pressupost per email.
 */
export async function sendQuote(
  supabase: SupabaseClient<Database>,
  user: User,
  quoteId: number,
): Promise<ActionResult> {
  try {
    // 1. Obtenir Dades Completes
    const { quote, contact, company } = await _fetchFullQuoteData(supabase, quoteId);

    // 2. Generar PDF (El servidor recalcularà els totals)
    const pdfBuffer = await generateQuotePdfBuffer(quote, company, contact);
    const pdfBase64 = pdfBuffer.toString("base64");

    // 3. Autenticació Google
    const { accessToken, userEmail } = await _getGoogleAuth(supabase, user.id);

    // 4. Construir i Enviar Email
    await _sendEmailViaGmail(
      accessToken, 
      userEmail, 
      contact, 
      quote, 
      company, 
      pdfBase64
    );

    // 5. Actualitzar Estats
    await _updateQuoteStatus(supabase, quoteId);
    if (quote.opportunity_id) {
      await _updateOpportunityStage(supabase, quote.opportunity_id);
    }

    return { success: true, message: `Pressupost enviat a ${contact.email}.` };
  } catch (error: unknown) {
    console.error("[sendQuote] Error fatal:", error);
    return { success: false, message: error instanceof Error ? error.message : "Error enviant." };
  }
}

// ------------------------------------------------------------------
// --- INTERNAL HELPERS ---
// ------------------------------------------------------------------

async function _fetchFullQuoteData(supabase: SupabaseClient<Database>, quoteId: number) {
  // ✅ 2. Apliquem el tipus genèric <QuoteDetailsResponse> aquí
  const { data, error } = await supabase
    .rpc('get_quote_details', { p_quote_id: quoteId })
    .single<QuoteDetailsResponse>(); 

  if (error || !data || !data.quote) throw new Error("Pressupost no trobat.");

  // Ara TypeScript sap que data.quote existeix
  // Fem un cast segur a EditableQuote
  const quote = data.quote as unknown as EditableQuote;
  
  // Recuperem contacte i equip a part ja que l'RPC potser només retorna IDs
  // (O si l'RPC ja retorna l'objecte sencer, adapta-ho aquí. Assumim que cal fer fetch)
  const [contactRes, teamRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', quote.contact_id!).single(),
      supabase.from('teams').select('*').eq('id', quote.team_id!).single()
  ]);

  if (contactRes.error || !contactRes.data) throw new Error("Contacte no trobat.");
  if (teamRes.error || !teamRes.data) throw new Error("Empresa no trobada.");
  
  const contact = contactRes.data;
  const company = teamRes.data;

  if (!contact.email) throw new Error("El contacte no té email.");
  if (!quote.secure_id) throw new Error("Falta ID segur (public link).");

  return { quote, contact, company };
}

async function _getGoogleAuth(supabase: SupabaseClient<Database>, userId: string) {
  if (!process.env.ENCRYPTION_SECRET_KEY) throw new Error("Falta ENCRYPTION_SECRET_KEY.");

  const { data: creds } = await supabase
    .from("user_credentials")
    .select("refresh_token, provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "google_gmail")
    .maybeSingle();

  if (!creds?.refresh_token) throw new Error("No hi ha credencials de Google connectades.");

  const decryptedToken = await decryptToken(creds.refresh_token, process.env.ENCRYPTION_SECRET_KEY);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: decryptedToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error("Error refrescant token Google.");

  return { accessToken: tokenData.access_token, userEmail: creds.provider_user_id! };
}

async function _sendEmailViaGmail(
  accessToken: string,
  senderEmail: string,
  contact: Contact,
  quote: EditableQuote,
  company: Team,
  pdfBase64: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const clientPortalUrl = `${baseUrl}/quote/${quote.secure_id}`;
  
  const mimeMessage = _buildMimeMessage(contact, quote, company.name, clientPortalUrl, senderEmail, pdfBase64);
  const rawEmail = Base64.encode(mimeMessage, true).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawEmail }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gmail API Error: ${err.error.message}`);
  }
}

async function _updateQuoteStatus(supabase: SupabaseClient<Database>, quoteId: number) {
  await supabase.from("quotes").update({ status: "Sent", sent_at: new Date().toISOString() }).eq("id", quoteId);
}

async function _updateOpportunityStage(supabase: SupabaseClient<Database>, opportunityId: number) {
  try {
    const { data: oppData } = await supabase
      .from("opportunities")
      .select("pipeline_stages(pipeline_id)")
      .eq("id", opportunityId)
      .single();

    if (!oppData?.pipeline_stages?.pipeline_id) return;

    const targetName = "Proposta Enviada";
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", oppData.pipeline_stages.pipeline_id)
      .ilike("name", targetName)
      .limit(1)
      .single();

    if (!stage) {
      console.warn(`[CRM] Stage '${targetName}' no trobat.`);
      return;
    }

    await supabase
      .from("opportunities")
      .update({ pipeline_stage_id: stage.id, stage_name: targetName })
      .eq("id", opportunityId);
      
  } catch (e) {
    console.warn("Error actualitzant CRM (no crític):", e);
  }
}

function _buildMimeMessage(
  contact: Contact,
  quote: EditableQuote,
  companyName: string,
  url: string,
  sender: string,
  pdfBase64: string
): string {
  const boundary = `----=_Part_${crypto.randomUUID()}`;
  const subject = `=?UTF-8?B?${Base64.encode(`El teu pressupost ${quote.quote_number} de ${companyName}`, true)}?=`;
  
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <p>Hola <strong>${contact.nom}</strong>,</p>
      <p>Adjuntem el pressupost <strong>#${quote.quote_number}</strong>.</p>
      <p><a href="${url}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Veure i Acceptar Online</a></p>
    </div>
  `;

  return [
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    `MIME-Version: 1.0`,
    `To: ${contact.email}`,
    `From: "${companyName}" <${sender}>`,
    `Subject: ${subject}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="pressupost-${quote.quote_number}.pdf"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ].join("\n");
}