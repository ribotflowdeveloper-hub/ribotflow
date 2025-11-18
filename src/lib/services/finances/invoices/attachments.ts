"use server";

import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type DbTableInsert } from "@/types/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { type InvoiceAttachment } from "@/types/finances/invoices";
import { type ActionResult } from "@/types/shared/index";

export async function uploadAttachment(
    supabase: SupabaseClient<Database>,
    invoiceId: number,
    teamId: string,
    formData: FormData,
): Promise<ActionResult<{ newAttachment: InvoiceAttachment }>> {
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, message: "Falta el fitxer." };

  // Validar accés
  const { data: exists } = await supabase.from("invoices").select("id").eq("id", invoiceId).eq("team_id", teamId).maybeSingle();
  if (!exists) return { success: false, message: "Factura no trobada." };

  // Pujar a Storage
  const filePath = `${teamId}/invoices/${invoiceId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("factures-adjunts").upload(filePath, file);
  if (uploadError) return { success: false, message: `Error Storage: ${uploadError.message}` };
  
  // Guardar referència
  const attachmentData: DbTableInsert<'invoice_attachments'> = {
      invoice_id: invoiceId,
      file_path: filePath,
      filename: file.name,
      mime_type: file.type,
      team_id: teamId,
  };
  const { data: dbData, error: dbError } = await supabase.from("invoice_attachments").insert(attachmentData).select().single();
  
  if (dbError) {
      await supabase.storage.from("factures-adjunts").remove([filePath]);
      return { success: false, message: `Error BD: ${dbError.message}` };
  }
  return { success: true, message: "Pujat correctament.", data: { newAttachment: dbData as InvoiceAttachment } };
}

export async function getAttachmentSignedUrl(
    teamId: string,
    filePath: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  if (!filePath || !filePath.startsWith(`${teamId}/`)) return { success: false, message: "Accés denegat." };

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.storage.from("factures-adjunts").createSignedUrl(filePath, 300); 
  
  if (error) return { success: false, message: error.message };
  return { success: true, message: "URL generada.", data: { signedUrl: data.signedUrl } };
}

export async function deleteAttachment(
    supabase: SupabaseClient<Database>,
    teamId: string,
    attachmentId: string,
    filePath: string | null,
): Promise<ActionResult> {
  if (!attachmentId) return { success: false, message: "Falta ID." };

  // Validar propietat
  const { data: attachment } = await supabase.from("invoice_attachments").select("team_id, file_path").eq("id", attachmentId).single();
  if (!attachment || attachment.team_id !== teamId) return { success: false, message: "No trobat o sense permís." };

  const finalPath = filePath || attachment.file_path;

  // Esborrar BD
  const { error: dbError } = await supabase.from("invoice_attachments").delete().eq("id", attachmentId);
  if (dbError) return { success: false, message: dbError.message };

  // Esborrar Storage
  if (finalPath) {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.storage.from("factures-adjunts").remove([finalPath]);
  }
  return { success: true, message: "Eliminat correctament." };
}