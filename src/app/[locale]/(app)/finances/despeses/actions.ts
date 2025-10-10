/**
 * @file actions.ts (Despeses)
 * @summary Server Actions per al mòdul de Gestió de Despeses.
 */

"use server";

import { revalidatePath } from "next/cache";
import { type Expense, type ExpenseItem } from "@/types/finances/index";
import { type ActionResult } from "@/types/shared/index"; // ✅ 1. Importem el teu tipus correcte
import { validateUserSession } from "@/lib/supabase/session";
import { SupabaseClient, User } from "@supabase/supabase-js";

// --- Helpers Interns (Extrets de saveExpenseAction) ---

/**
 * Crea o actualitza la despesa principal a la base de dades.
 */
async function upsertExpenseDetails(
  supabase: SupabaseClient,
  expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id" | "expense_items">,
  expenseId: string | null,
  userId: string,
  teamId: string
): Promise<ActionResult<Expense>> {
  if (expenseData.expense_date) {
    try {
      expenseData.expense_date = new Date(expenseData.expense_date).toISOString().split('T')[0];
    } catch (e) {
      console.error("Error al formatar la data:", e);
      return { success: false, message: "Format de data invàlid." }; // ✅ CORREGIT
    }
  }

  const query = expenseId
    ? supabase.from("expenses").update(expenseData).eq("id", expenseId)
    : supabase.from("expenses").insert({ ...expenseData, user_id: userId, team_id: teamId });

  const { data, error } = await query.select().single();

  if (error) {
    return { success: false, message: error.message }; // ✅ CORREGIT
  }
  
  return { success: true, message: "Despesa desada correctament.", data: data as Expense }; // ✅ CORREGIT
}

/**
 * Sincronitza els conceptes d'una despesa.
 */
async function syncExpenseItems(
    supabase: SupabaseClient,
    expenseId: string,
    items: ExpenseItem[] | undefined,
    user: User,
    teamId: string
): Promise<ActionResult> {
    if (!items) { // Si no hi ha 'items' a l'objecte, no fem res.
      return { success: true, message: "No hi ha conceptes per sincronitzar." };
    }

    // Si ExpenseItem no té 'id', aquesta línia s'ha d'ajustar o eliminar.
    // Per exemple, si cada item té una descripció única:
    // const itemIdsFromForm = items.map(item => item.description).filter(Boolean);

    // Si no es pot identificar per 'id', simplement no utilitzis aquesta lògica:
    const itemIdsFromForm: string[] = [];

    const { error: deleteError } = await supabase
        .from('expense_items')
        .delete()
        .eq('expense_id', expenseId)
        .not('id', 'in', `(${itemIdsFromForm.join(',')})`);

    if (deleteError) {
      return { success: false, message: `Error esborrant conceptes: ${deleteError.message}` }; // ✅ CORREGIT
    }
    
    if (items.length === 0) {
      return { success: true, message: "Tots els conceptes s'han esborrat." }; // ✅ CORREGIT
    }

    const itemsToUpsert = items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        expense_id: expenseId,
        user_id: user.id,
        team_id: teamId
    }));

    const { error: upsertError } = await supabase.from("expense_items").upsert(itemsToUpsert);
    if (upsertError) {
      return { success: false, message: `Error actualitzant conceptes: ${upsertError.message}` }; // ✅ CORREGIT
    }
    
    return { success: true, message: "Conceptes sincronitzats correctament." }; // ✅ CORREGIT
}


// --- Server Actions Públiques ---

export async function processOcrAction(formData: FormData): Promise<ActionResult<Record<string, unknown>>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message }; // ✅ CORREGIT
    const { supabase } = session;

    const { data, error } = await supabase.functions.invoke("process-ocr", { body: formData });
    
    if (error) {
      return { success: false, message: error.message }; // ✅ CORREGIT
    }
    return { success: true, message: "Document processat amb èxit.", data }; // ✅ CORREGIT
}

export async function saveExpenseAction(
    expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id" | "expense_items"> & { expense_items?: ExpenseItem[] },
    expenseId: string | null
): Promise<ActionResult<Expense>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message }; // ✅ CORREGIT
    const { supabase, user, activeTeamId } = session;

    const { expense_items, ...rest } = expenseData;
    // Elimina 'expense_items' explícitament per evitar errors de tipus
    const expenseDetails = { ...rest };

    // Pas 1: Desar la despesa principal
    const expenseResult = await upsertExpenseDetails(supabase, expenseDetails, expenseId, user.id, activeTeamId);
    if (!expenseResult.success || !expenseResult.data) {
      return expenseResult; // Retornem l'error que ja ve formatat
    }
    
    // Pas 2: Sincronitzar els conceptes
    const itemsResult = await syncExpenseItems(supabase, expenseResult.data.id ?? "", expense_items, user, activeTeamId);
    if (!itemsResult.success) {
      return { success: false, message: itemsResult.message, data: undefined }; // Cast to ActionResult<Expense>
    }

    revalidatePath("/finances/despeses");
    return { success: true, message: "Despesa desada amb èxit.", data: expenseResult.data }; // ✅ CORREGIT
}

export async function uploadAttachmentAction(expenseId: string, formData: FormData): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message }; // ✅ CORREGIT
    const { supabase, user, activeTeamId } = session;

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." }; // ✅ CORREGIT

    const filePath = `${activeTeamId}/${expenseId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("despeses-adjunts").upload(filePath, file);
    if (uploadError) return { success: false, message: uploadError.message }; // ✅ CORREGIT

    const { error: dbError } = await supabase.from("expense_attachments").insert({
        expense_id: expenseId,
        user_id: user.id,
        team_id: activeTeamId,
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
    });
    if (dbError) return { success: false, message: dbError.message }; // ✅ CORREGIT

    revalidatePath("/finances/despeses");
    return { success: true, message: "Adjunt pujat correctament." }; // ✅ CORREGIT
}