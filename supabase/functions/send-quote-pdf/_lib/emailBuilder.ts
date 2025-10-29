// supabase/functions/send-quote-pdf/_lib/emailBuilder.ts

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { type Contact, type Quote } from "./types.ts";

// Helper per codificar l'assumpte per a Gmail
function encodeSubject(subject: string): string {
  const encoded = encodeBase64(new TextEncoder().encode(subject));
  return `=?UTF-8?B?${encoded}?=`;
}

// Helper per codificar tot el missatge per a l'API raw de Gmail
export const encodeEmailForGmail = (msg: string): string =>
  encodeBase64(new TextEncoder().encode(msg))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * Construeix el cos HTML de l'email.
 */
function buildHtmlBody(contact: Contact, quote: Quote, companyName: string, clientPortalUrl: string, senderEmail: string): string {
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
 * Construeix el missatge complet en format MIME multipart/mixed.
 */
export function buildMimeMessage(
  contact: Contact,
  quote: Quote,
  companyName: string,
  clientPortalUrl: string,
  senderEmail: string,
  pdfBase64: string
): string {
  console.log("Building email message...");
  const subject = `El teu pressupost ${quote.quote_number} de ${companyName}`;
  const boundary = `----=_Part_${crypto.randomUUID()}`;
  const htmlBody = buildHtmlBody(contact, quote, companyName, clientPortalUrl, senderEmail);

  const emailMessage = [
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    `MIME-Version: 1.0`,
    `To: ${contact.email}`,
    `From: ${senderEmail}`, // Encara que Gmail ho sobreescriu
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
    `Content-Disposition: attachment; filename="${quote.quote_number}.pdf"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`
  ].join('\n');
  console.log("Email MIME structure built.");
  return emailMessage;
}