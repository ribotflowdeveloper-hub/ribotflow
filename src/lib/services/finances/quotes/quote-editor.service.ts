"use server"; // Assegurem que és un Server Component

import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type ActionResult } from "@/types/shared/index";

// Importem tots els tipus necessaris des del fitxer centralitzat
import {
  type InitialQuoteType,
  type NewQuote,
  type Product,
  type Quote,
  type QuoteDetailsResponse,
  type QuoteEditorDataPayload,
  type QuoteItem,
  type QuotePayload,
  type Team,
} from "@/types/finances/quotes";
import { generateQuotePdfBuffer } from "@/lib/pdf/generateQuotePDF";
import { type EditableQuote } from "@/app/[locale]/(app)/finances/quotes/[id]/_hooks/useQuoteEditor";

import { Base64 } from "js-base64";
import crypto from "crypto"; // Per al randomUUID de Node.js
import { PostgrestError } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/utils/crypto";

// --- Tipus Locals ---
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

/**
 * SERVEI: Obté totes les dades necessàries per a l'editor de pressupostos.
 */
export async function getQuoteEditorData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  userId: string,
  quoteId: string | "new",
): Promise<{ data: QuoteEditorDataPayload | null; error: string | null }> {
  try {
    if (quoteId === "new") {
      // --- LÒGICA PER A UN PRESSUPOST NOU ---
      const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise
        .all([
          supabase.from("contacts").select("*").eq("team_id", teamId),
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .eq("team_id", teamId),
          supabase.from("teams").select("*").eq("id", teamId).single(),
          supabase
            .from("quotes")
            .select("sequence_number")
            .eq("team_id", teamId)
            .order("sequence_number", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      const errors = [
        contactsRes.error,
        productsRes.error,
        teamRes.error,
        lastQuoteRes.error,
      ].filter(Boolean);
      if (errors.length > 0) {
        console.error(
          "Error en carregar les dades per a un nou pressupost (service):",
          errors,
        );
        throw new Error("Error en carregar les dades de l'editor.");
      }

      // Lògica de negoci (càlcul del número de pressupost)
      const lastSequence = lastQuoteRes.data?.sequence_number || 0;
      const nextSequence = lastSequence + 1;
      const year = new Date().getFullYear();
      const formattedQuoteNumber = `PRE-${year}-${
        String(
          nextSequence,
        ).padStart(4, "0")
      }`;

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

        // --- Aquests són els canvis de la Fase 1 ---
        subtotal: 0,
        discount_amount: 0, // 👈 Abans 'discount'
        tax_amount: 0, // 👈 Abans 'tax'
        tax_rate: 0.21, // 👈 Abans 'tax_percent' (i ara és decimal 0.21)
        total_amount: 0, // 👈 Abans 'total'
        // --- Fi dels canvis ---

        // --- Fi de les propietats requerides ---

        show_quantity: true,
        created_at: new Date().toISOString(),
        sent_at: null,
        rejection_reason: null,
        send_at: null,
        theme_color: null,
        secure_id: crypto.randomUUID(),
        items: [
          {
            description: "",
            quantity: 1,
            unit_price: 0,
          },
        ],
      };
      // ✅✅✅ FI DE LA CORRECCIÓ ✅✅✅

      const payload: QuoteEditorDataPayload = {
        initialQuote: initialQuote as InitialQuoteType,
        contacts: contactsRes.data || [],
        products: productsRes.data || [],
        companyProfile: teamRes.data as Team | null,
        initialOpportunities: [],
        pdfUrl: null, // No hi ha PDF per a un pressupost nou
      };
      return { data: payload, error: null };
    } else {
      // --- LÒGICA PER A EDITAR UN PRESSUPOST EXISTENT ---
      const numericQuoteId = Number(quoteId);
      const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise
        .all([
          supabase.from("contacts").select("*").eq("team_id", teamId),
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .eq("team_id", teamId),
          supabase.from("teams").select("*").eq("id", teamId).single(),
          supabase
            .rpc("get_quote_details", { p_quote_id: numericQuoteId })
            .single<QuoteDetailsResponse>(),
        ]);

      const errors = [
        contactsRes.error,
        productsRes.error,
        teamRes.error,
        quoteDetailsRes.error,
      ].filter(Boolean);
      if (errors.length > 0) {
        console.error(
          "Error en carregar les dades d'un pressupost existent (service):",
          errors,
        );
        throw new Error("Error en carregar les dades de l'editor.");
      }

      const quoteDetails = quoteDetailsRes.data;
      if (!quoteDetails?.quote) {
        return { data: null, error: "Pressupost no trobat." };
      }

      let pdfUrl: string | null = null;
      const filePath = `quotes/${teamId}/${quoteId}.pdf`;
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from("fitxers-privats")
        .createSignedUrl(filePath, 60 * 5); // 5 minuts

      if (signedUrlError) {
        console.warn(
          `No s'ha pogut generar la URL signada per a ${filePath} (service): ${signedUrlError.message}`,
        );
      } else {
        pdfUrl = signedUrlData.signedUrl;
      }

      const payload: QuoteEditorDataPayload = {
        initialQuote: quoteDetails.quote as Quote & { items: QuoteItem[] },
        contacts: contactsRes.data || [],
        products: productsRes.data || [],
        companyProfile: teamRes.data as Team | null,
        initialOpportunities: quoteDetails.opportunities || [],
        pdfUrl: pdfUrl,
      };
      return { data: payload, error: null };
    }
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Error desconegut al carregar les dades de l'editor.";
    console.error("Error a getQuoteEditorData (service):", message);
    return { data: null, error: message };
  }
}

/**
 * SERVEI: Desa (crea o actualitza) un pressupost i els seus conceptes.
 */
export async function saveQuote(
  supabase: SupabaseClient<Database>,
  quoteData: QuotePayload,
  teamId: string,
): Promise<ActionResult<number>> {
  // ... (Aquesta funció no té canvis)
  // 1. Validació de dades
  if (!quoteData.contact_id) {
    return { success: false, message: "Cal seleccionar un client." };
  }
  if (quoteData.id === "new") {
    quoteData.team_id = teamId;
  }
  if (!quoteData.team_id) {
    return {
      success: false,
      message: "El pressupost no està assignat a cap equip.",
    };
  }
  if (quoteData.items.length === 0) {
    return {
      success: false,
      message: "El pressupost ha de tenir almenys un concepte.",
    };
  }
  const hasInvalidItem = quoteData.items.some(
    (item) => !item.description?.trim() || (item.quantity ?? 1) <= 0,
  );
  if (hasInvalidItem) {
    return {
      success: false,
      message:
        "Un o més conceptes tenen dades invàlides (descripció buida o quantitat 0).",
    };
  }

  // 2. Crida a la BD
  try {
    const { data, error } = await supabase.rpc("upsert_quote_with_items", {
      quote_payload: quoteData as QuotePayload,
    });

    if (error) {
      console.error(
        "Supabase RPC Error (service):",
        JSON.stringify(error, null, 2),
      );
      throw new Error(
        error.message || "Error a la funció RPC 'upsert_quote_with_items'",
      );
    }

    const finalQuoteId = (data as { quote_id: number }).quote_id;
    return { success: true, message: "Pressupost desat.", data: finalQuoteId };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Error desconegut al desar el pressupost.";
    console.error("Error a saveQuote (service):", message);
    if (message.includes("constraint")) {
      return {
        success: false,
        message:
          "Error de dades. Assegura't que tots els camps obligatoris estan omplerts.",
      };
    }
    return { success: false, message };
  }
}

/**
 * SERVEI: Esborra un pressupost i els seus items.
 */
export async function deleteQuote(
  supabase: SupabaseClient<Database>,
  quoteId: number,
): Promise<{ error: PostgrestError | null }> {
  // ... (Aquesta funció no té canvis)
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
  teamId: string,
): Promise<ActionResult<Product>> {
  // ... (Aquesta funció no té canvis)
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
    const message = error instanceof Error
      ? error.message
      : "Error en crear el producte.";
    return { success: false, message };
  }
}

/**
 * SERVEI: Actualitza el perfil de l'equip.
 */
export async function updateTeamProfile(
  supabase: SupabaseClient<Database>,
  teamData: Partial<Team>,
  teamId: string,
): Promise<ActionResult<Team>> {
  // ... (Aquesta funció no té canvis)
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
    const message = error instanceof Error
      ? error.message
      : "Error en actualitzar el perfil.";
    return { success: false, message };
  }
}

// --- INICI DE LA LÒGICA D'ENVIAMENT (Moguda de l'Edge Function) ---

/**
 * HELPER 1: Autenticació de Google
 */
async function getGoogleAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ accessToken: string; userEmail: string }> {
  // ... (Aquesta funció no té canvis)
  if (!process.env.ENCRYPTION_SECRET_KEY) {
    throw new Error(
      "Falta ENCRYPTION_SECRET_KEY a les variables d'entorn per desxifrar el token.",
    );
  }

  console.log("[sendQuote] Obtenint credencials d_usuari...");
  const { data: creds, error: credsError } = await supabase
    .from("user_credentials")
    .select("refresh_token, provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "google_gmail")
    .maybeSingle();

  if (credsError) {
    throw new Error(`Error obtenint credencials: ${credsError.message}`);
  }
  if (!creds?.refresh_token) {
    throw new Error(
      "No s'han trobat les credencials de Google (refresh token). Si us plau, connecta el teu compte a 'Integracions'.",
    );
  }
  if (!creds.provider_user_id) {
    throw new Error(
      "Les credencials no tenen un email (provider_user_id) associat.",
    );
  }

  console.log("[sendQuote] Desencriptant refresh token...");
  const decryptedToken = await decryptToken(
    creds.refresh_token,
    process.env.ENCRYPTION_SECRET_KEY,
  );
  console.log("[sendQuote] Token desencriptat correctament.");

  console.log("[sendQuote] Sol·licitant nou Google Access Token...");
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

  const tokenData: GoogleTokenResponse = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Error en la resposta de Google Token:", tokenData);
    throw new Error("No s'ha pogut refrescar l'access token de Google.");
  }

  console.log("[sendQuote] Google Access Token obtingut.");
  return {
    accessToken: tokenData.access_token,
    userEmail: creds.provider_user_id,
  };
}

/**
 * HELPER 2: Cos de l'Email
 */
function buildHtmlBody(
  contact: Contact,
  quote: EditableQuote,
  companyName: string,
  clientPortalUrl: string,
  senderEmail: string,
): string {
  // ... (Aquesta funció no té canvis)
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
      <p>Hola <strong>${contact.nom}</strong>,</p>
      <p>Gràcies per la teva confiança. Hem adjuntat una còpia en PDF del pressupost <strong>#${quote.quote_number}</strong>.</p>
      <p>Per a la teva comoditat, també pots revisar, acceptar o rebutjar el pressupost de forma digital fent clic al següent botó:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${clientPortalUrl}" style="display: inline-block; background-color: #007bff; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: all 0.3s ease;">
          Revisar i Acceptar Online
        </a>
      </div>
      <p>Estem a la teva disposició per a qualsevol dubte que puguis tenir.</p>
      <p>Salutacions,<br><strong>${companyName}</strong></p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        Aquest missatge és automàtic. Si tens algun problema amb els enllaços, contacta amb nosaltres a <a href="mailto:${senderEmail}" style="color: #007bff; text-decoration: none;">${senderEmail}</a>.
      </p>
    </div>
  `;
}

/**
 * HELPER 3: Missatge MIME
 */
function buildMimeMessage(
  contact: Contact,
  quote: EditableQuote,
  companyName: string,
  clientPortalUrl: string,
  senderEmail: string,
  pdfBase64: string,
): string {
  // ... (Aquesta funció no té canvis)
  console.log("[sendQuote] Construint missatge MIME...");
  const subject = `El teu pressupost ${quote.quote_number} de ${companyName}`;

  const encodeSubject = (subject: string): string => {
    const encoded = Base64.encode(subject, true); // true = URL-safe
    return `=?UTF-8?B?${encoded}?=`;
  };

  const boundary = `----=_Part_${crypto.randomUUID()}`;
  const htmlBody = buildHtmlBody(
    contact,
    quote,
    companyName,
    clientPortalUrl,
    senderEmail,
  );
  const fileName = `pressupost-${quote.quote_number || quote.id}.pdf`;

  const emailMessage = [
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    `MIME-Version: 1.0`,
    `To: ${contact.email}`,
    `From: "${companyName}" <${senderEmail}>`,
    `Subject: ${encodeSubject(subject)}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    htmlBody,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${fileName}"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ].join("\n");

  console.log("[sendQuote] Estructura MIME construïda.");
  return emailMessage;
}

/**
 * SERVEI PRINCIPAL: Envia el pressupost per email (PDF "al vol" + Gmail API)
 *
 * ✅ *** LÒGICA DE PIPELINE CORREGIDA ***
 */
export async function sendQuote(
  supabase: SupabaseClient<Database>,
  user: User,
  quoteId: number,
): Promise<ActionResult> {
  try {
    // --- 1. Obtenir Dades ---
    console.log(`[sendQuote] Obtenint dades per al pressupost ${quoteId}...`);
    // ✅ CORRECCIÓ: Necessitem 'opportunity_id' a la consulta principal
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select("*, items:quote_items(*), contacts(*), team:teams(*)")
      .eq("id", quoteId)
      .single();

    if (quoteError) {
      throw new Error(`Error en llegir el pressupost: ${quoteError.message}`);
    }
    if (!quoteData) throw new Error("Pressupost no trobat.");

    const quote = quoteData as unknown as EditableQuote;
    const contact = quoteData.contacts as Contact | null;
    const company = quoteData.team as Team | null;

    // Validacions (sense canvis)
    if (!contact) {
      return {
        success: false,
        message: "El pressupost no té un contacte assignat.",
      };
    }
    if (!contact.email) {
      return {
        success: false,
        message: "El contacte no té un email assignat.",
      };
    }
    if (!company) {
      return {
        success: false,
        message: "No s'ha pogut trobar el perfil de la teva empresa.",
      };
    }
    if (!quote.secure_id) {
      return {
        success: false,
        message: "Falta l'ID segur per a l'enllaç públic.",
      };
    }

    console.log("[sendQuote] Dades obtingudes correctament.");

    // --- 2. Generar el PDF "al vol" ---
    // ... (sense canvis) ...
    console.log(
      `[sendQuote] Generant PDF per al pressupost ${quote.quote_number}...`,
    );
    const pdfBuffer = await generateQuotePdfBuffer(quote, company, contact);
    const pdfBase64 = pdfBuffer.toString("base64");
    console.log(
      `[sendQuote] PDF generat (${(pdfBuffer.length / 1024).toFixed(1)} KB)`,
    );

    // --- 3. Obtenir Autenticació de Google ---
    // ... (sense canvis) ...
    const { accessToken, userEmail } = await getGoogleAccessToken(
      supabase,
      user.id,
    );

    // --- 4. Construir Email MIME ---
    // ... (sense canvis) ...
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const clientPortalUrl = `${baseUrl}/quote/${quote.secure_id}`;
    const companyName = company.name || "El teu equip";

    const mimeMessage = buildMimeMessage(
      contact,
      quote,
      companyName,
      clientPortalUrl,
      userEmail,
      pdfBase64,
    );

    const rawEmail = Base64.encode(mimeMessage, true)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // --- 5. Enviar Email via Gmail API ---
    // ... (sense canvis) ...
    console.log(
      `[sendQuote] Enviant email via Gmail API com a ${userEmail}...`,
    );
    const gmailRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawEmail }),
      },
    );

    if (!gmailRes.ok) {
      const errorData = await gmailRes.json();
      console.error("Error enviant Gmail:", errorData);
      throw new Error(`Error de l'API de Gmail: ${errorData.error.message}`);
    }
    console.log(`[sendQuote] Email enviat correctament a ${contact.email}.`);

    // --- 6. Actualitzar Estats (LÒGICA CORREGIDA) ---

    // 6a. Actualitzem el pressupost (Quote)
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ status: "Sent", sent_at: new Date().toISOString() })
      .eq("id", quoteId);

    if (updateError) {
      console.warn(
        `[sendQuote] Email enviat, però no s'ha pogut actualitzar l'estat: ${updateError.message}`,
      );
    }

    // 6b. Moure l'Oportunitat (si existeix)
    if (quote.opportunity_id) {
      try {
        // PAS 1: Obtenir el pipeline_id de l'oportunitat actual
        // Ho fem unint l'etapa actual per trobar el seu 'pipeline_id' pare
        const { data: oppData, error: oppError } = await supabase
          .from("opportunities")
          .select("pipeline_stage_id, pipeline_stages(pipeline_id)")
          .eq("id", quote.opportunity_id)
          .single();

        if (oppError || !oppData || !oppData.pipeline_stages) {
          throw new Error(
            `Oportunitat ${quote.opportunity_id} no trobada o sense pipeline_stage vàlid.`,
          );
        }

        const currentPipelineId = oppData.pipeline_stages.pipeline_id;
        const targetStageName = "Proposta Enviada";

        // PAS 2: Buscar l'ID de l'etapa "Proposta Enviada" DINS d'aquest pipeline
        const { data: targetStage, error: stageError } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("pipeline_id", currentPipelineId)
          .ilike("name", targetStageName) // Busquem el nom (case-insensitive)
          .limit(1)
          .single();

        if (stageError || !targetStage) {
          throw new Error(
            `No s'ha trobat l'etapa '${targetStageName}' al pipeline ${currentPipelineId}.`,
          );
        }

        // PAS 3: Actualitzar l'oportunitat amb l'ID de l'etapa correcte
        const { error: updateOppError } = await supabase
          .from("opportunities")
          .update({
            pipeline_stage_id: targetStage.id, // <-- AQUESTA ÉS LA CORRECCIÓ
            stage_name: targetStageName, // <-- Actualitzem el text per consistència
          })
          .eq("id", quote.opportunity_id);

        if (updateOppError) {
          throw new Error(
            `No s'ha pogut moure l'oportunitat: ${updateOppError.message}`,
          );
        }

        console.log(
          `[sendQuote] Oportunitat ${quote.opportunity_id} moguda a '${targetStageName}' (ID: ${targetStage.id})`,
        );
      } catch (oppMoveError: unknown) {
        // Si el moviment de l'oportunitat falla, no aturem l'èxit de l'enviament de l'email,
        // però sí que ho registrem.
        console.warn(
          `[sendQuote] L'email s'ha enviat, però ha fallat el moviment de l'oportunitat: ${
            (oppMoveError as Error).message
          }`,
        );
      }
    }

    return { success: true, message: `Pressupost enviat a ${contact.email}.` };
  } catch (error) {
    console.error("[sendQuote] Error fatal:", error);
    const message = error instanceof Error
      ? error.message
      : "No s'ha pogut enviar el pressupost.";
    return { success: false, message };
  }
}
