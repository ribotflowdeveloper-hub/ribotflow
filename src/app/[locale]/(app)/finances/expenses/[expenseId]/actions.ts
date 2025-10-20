"use server";

import { revalidatePath } from "next/cache";
import {
  type Expense,
  type ExpenseItem,
  type ExpenseDetail,
  type ExpenseFormDataForAction,
  type ExpenseAttachment, // ✅ Assegura't que aquest tipus existeix
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { validateUserSession } from "@/lib/supabase/session";
import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin"; // ✅ Importat per a esborrar/signar

// --- Helpers Interns (Corregits) ---

async function upsertExpenseDetails(
  supabase: SupabaseClient,
  expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id" | 'expense_attachments' | 'suppliers' | 'expense_items'>,
  expenseId: string | number | null,
  userId: string,
  teamId: string
): Promise<ActionResult<{ id: number }>> {
  if (expenseData.expense_date) {
    try {
      expenseData.expense_date = new Date(expenseData.expense_date).toISOString().split('T')[0];
    } catch (e) {
      console.error("Error al formatar la data:", e);
      return { success: false, message: "Format de data invàlid." };
    }
  }

  expenseData.supplier_id = expenseData.supplier_id || null;
  expenseData.project_id = expenseData.project_id || null;

  console.log("Data being sent to upsertExpenseDetails:", JSON.stringify(expenseData, null, 2));

  const query = expenseId
    ? supabase.from("expenses").update(expenseData).eq("id", expenseId)
    : supabase.from("expenses").insert({ ...expenseData, user_id: userId, team_id: teamId });

  // ✅ Important: .select('id').single() retorna l'ID tant a INSERT com a UPDATE.
  const { data, error } = await query.select('id').single();

  if (error) {
    console.error("Error upserting expense:", error);
    console.error("Supabase error details:", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return { success: false, message: `Error en desar la despesa: ${error.message}` };
  }
  if (!data || typeof data.id !== 'number') {
    console.error("Error upserting expense: ID not returned.");
    return { success: false, message: "Error en desar: ID no retornat." };
  }

  // ✅ Sempre retornem l'ID obtingut (sigui nou o existent)
  return { success: true, message: "Despesa desada (ID obtingut).", data: { id: data.id } };
}

async function syncExpenseItems(
  supabase: SupabaseClient,
  expenseId: number,
  items: ExpenseItem[] | undefined,
  user: User,
  teamId: string
): Promise<ActionResult> {
  if (!items || items.length === 0) {
    const { error: deleteError } = await supabase.from('expense_items').delete().eq('expense_id', expenseId);
    if (deleteError) {
      return { success: false, message: `Error netejant conceptes antics: ${deleteError.message}` };
    }
    return { success: true, message: "No hi ha conceptes per sincronitzar." };
  }

  const existingItemIds = items.map(item => item.id).filter(id => typeof id === 'number' && id > 0);

  let deleteQuery = supabase
    .from('expense_items')
    .delete()
    .eq('expense_id', expenseId);

  if (existingItemIds.length > 0) {
    deleteQuery = deleteQuery.not('id', 'in', `(${existingItemIds.join(',')})`);
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    return { success: false, message: `Error esborrant conceptes: ${deleteError.message}` };
  }

  const itemsToUpsert = items.map(item => ({
    // Si l'ID és invàlid o temporal (p.ex. un string 'new-item-...') el posem a undefined
    id: (typeof item.id === 'number' && item.id > 0) ? item.id : undefined,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
    // Assegura't que la resta de camps són correctes
    expense_id: expenseId,
    user_id: user.id,
    team_id: teamId,
  }));
  

  const { error: upsertError } = await supabase
    .from("expense_items")
    .upsert(itemsToUpsert, { onConflict: 'id', ignoreDuplicates: false });

  if (upsertError) {
    console.error("Error upserting items:", upsertError);
    return { success: false, message: `Error actualitzant conceptes: ${upsertError.message}` };
  }

  return { success: true, message: "Conceptes sincronitzats correctament." };
}

// --- Server Actions Públiques ---

export async function fetchExpenseDetail(expenseId: number): Promise<ExpenseDetail | null> {
  const supabase = createServerActionClient();

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      suppliers (id, nom, nif),
      expense_items (*),
      expense_attachments (*)
    `)
    .eq('id', expenseId)
    .single();

  if (error) {
    console.error("Error fetching expense detail:", error.message);
    return null;
  }

  console.log("Data received from fetchExpenseDetail:", data);
  
  // Assegura't que el tipus ExpenseDetail inclou expense_attachments com un array
  return data as unknown as ExpenseDetail;
}

export async function saveExpenseAction(
  expenseData: ExpenseFormDataForAction,
  expenseId: string | number | null // Aquest expenseId és l'ID de la URL ('new' o un número)
): Promise<ActionResult<{ id: number }>> { // ✅ Sempre retornarem un ID
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const { expense_items, id: formId, ...dataToUpsert } = expenseData;
  
  delete (dataToUpsert as Record<string, unknown>).suppliers;
  delete (dataToUpsert as Record<string, unknown>).expense_attachments;
  
  // Determina l'ID real (pot ser null si és 'new')
  const currentId: number | null = (typeof expenseId === 'number') 
    ? expenseId 
    : (typeof formId === 'number' && formId > 0 ? formId : null);

  const expenseResult = await upsertExpenseDetails(supabase, dataToUpsert, currentId, user.id, activeTeamId);
  
  if (!expenseResult.success || !expenseResult.data?.id) {
    // Si falla el upsert principal, retornem l'error
    return { success: false, message: expenseResult.message || "Error desconegut en desar." };
  }

  // ✅ BUG CORREGIT: Obtenim l'ID del resultat de l'upsert.
  // Això funciona tant per a INSERT (retorna el nou ID) com per a UPDATE (retorna l'ID existent).
  const resultingExpenseId = expenseResult.data.id;

  // Ara sincronitzem els ítems utilitzant l'ID correcte (sigui nou o existent)
  const itemsResult = await syncExpenseItems(supabase, resultingExpenseId, expense_items, user, activeTeamId);
  
  if (!itemsResult.success) {
    // Si fallen els ítems, retornem l'error, però l'ID de la despesa
    return { success: false, message: itemsResult.message, data: { id: resultingExpenseId } };
  }

  // Revalidem la pàgina específica (ara funciona per a 'new' també)
  revalidatePath(`/finances/expenses/${resultingExpenseId}`);
  // Revalidem el llistat general
  revalidatePath("/finances/expenses"); 

  // Retornem èxit, amb l'ID resultant
  return { success: true, message: "Despesa desada.", data: { id: resultingExpenseId } };
}

export async function uploadAttachmentAction(expenseId: string | number, formData: FormData): Promise<ActionResult<{ newAttachment: ExpenseAttachment }>> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

  const filePath = `${activeTeamId}/${expenseId}/${Date.now()}-${file.name}`;
  
  // 1. Pujar a Storage
  const { error: uploadError } = await supabase.storage
    .from("despeses-adjunts")
    .upload(filePath, file);
    
  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { success: false, message: `Error de Storage: ${uploadError.message}` };
  }

  // 2. Desar a la Base de Dades
  const attachmentData = {
    expense_id: expenseId as number,
    user_id: user.id,
    team_id: activeTeamId,
    file_path: filePath,
    filename: file.name,
    mime_type: file.type,
  };

  const { data: dbData, error: dbError } = await supabase
    .from("expense_attachments")
    .insert(attachmentData)
    .select() // ✅ Retornem la fila inserida
    .single();
    
  if (dbError) {
    console.error("DB insert error after upload:", dbError);
    // Intentem esborrar el fitxer de storage si la BD falla (compensació)
    await supabase.storage.from("despeses-adjunts").remove([filePath]);
    return { success: false, message: `Error de BD: ${dbError.message}` };
  }

  revalidatePath(`/finances/expenses/${expenseId}`);
  
  // ✅ Retornem el nou adjunt perquè el client l'afegeixi a l'estat
  return { 
    success: true, 
    message: "Adjunt pujat correctament.", 
    data: { newAttachment: dbData as ExpenseAttachment } 
  };
}

export async function deleteExpense(expenseId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  // TODO: Hauríem d'esborrar també els adjunts de Storage aquí?
  // 1. Obtenir adjunts (opcional, però recomanat)
  // 2. Esborrar despesa (s'hauria d'esborrar en cascada 'expense_items' i 'expense_attachments')
  // 3. Esborrar fitxers de Storage

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    console.error("Error deleting expense:", error.message);
    return { success: false, message: `Error al eliminar la despesa: ${error.message}` };
  }

  revalidatePath("/finances/expenses");
  // Hauríem de redirigir l'usuari si estava a la pàgina de detall?
  // Això es gestiona millor al client després de rebre l'èxit.
  return { success: true, message: `Despesa eliminada correctament.` };
}

export async function getAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };

  const userTeamId = session.activeTeamId;
  const fileTeamId = filePath.split('/')[0];
  
  if (userTeamId !== fileTeamId) {
    return { success: false, message: "Accés denegat." };
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.storage
    .from('despeses-adjunts')
    .createSignedUrl(filePath, 60 * 5); // ✅ URL vàlida per 5 minuts

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: "URL signada generada.", data: { signedUrl: data.signedUrl } };
}

export async function deleteAttachmentAction(
  attachmentId: string, // L'ID de la taula expense_attachments (UUID)
  filePath: string
): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) return { success: false, message: session.error.message };
  
  const { supabase, activeTeamId } = session;

  // 1. Esborrar de la Base de Dades (amb comprovació de team_id)
  const { error: dbError } = await supabase
    .from('expense_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('team_id', activeTeamId);

  if (dbError) {
    console.error("Error deleting attachment from DB:", dbError);
    return { success: false, message: `Error esborrant adjunt de la BD: ${dbError.message}` };
  }

  // 2. Esborrar de Storage (amb Admin Client per seguretat)
  const supabaseAdmin = createAdminClient();
  const { error: storageError } = await supabaseAdmin.storage
    .from('despeses-adjunts')
    .remove([filePath]);

  if (storageError) {
    console.error("Error deleting attachment from Storage:", storageError);
    // No retornem error fatal, ja que la BD és la font de veritat
    // Però avisem
    return { success: false, message: `Error esborrant fitxer de Storage: ${storageError.message}` };
  }

  // No cal revalidatePath aquí. El client que crida aquesta acció
  // (ExpenseDetailClient) hauria d'actualitzar el seu propi estat o refrescar.
  
  return { success: true, message: "Adjunt eliminat correctament." };
}