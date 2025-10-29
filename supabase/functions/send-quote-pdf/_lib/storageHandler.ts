// supabase/functions/send-quote-pdf/_lib/storageHandler.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { type Quote } from "./types.ts";

/**
 * Descarrega el PDF del pressupost des de Supabase Storage i el retorna en Base64.
 */
export async function downloadAndEncodePdf(supabaseAdmin: SupabaseClient, quote: Quote): Promise<string> {
  const filePath = `quotes/${quote.team_id}/${quote.id}.pdf`;
  console.log("Expected PDF path:", filePath);

  console.log("Downloading PDF from private storage...");
  const { data: pdfBlob, error: downloadError } = await supabaseAdmin.storage
    .from('fitxers-privats') // Bucket PRIVAT
    .download(filePath);

  if (downloadError) {
    console.error("Error downloading private PDF:", downloadError);
    throw new Error(`No s'ha pogut descarregar el PDF des de Storage (${downloadError.message}). Assegura't que existeix a: ${filePath}`);
  }
  console.log("PDF downloaded successfully.");

  const pdfArrayBuffer = await pdfBlob!.arrayBuffer();
  const pdfBase64 = encodeBase64(pdfArrayBuffer);
  console.log("PDF encoded to Base64.");

  return pdfBase64;
}