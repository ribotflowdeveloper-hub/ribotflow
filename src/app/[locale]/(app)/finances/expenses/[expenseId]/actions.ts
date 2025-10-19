"use server";

import { revalidatePath } from "next/cache";
import {
    type Expense,
    type ExpenseItem,
    type ExpenseDetail,
    type ExpenseFormDataForAction
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { validateUserSession } from "@/lib/supabase/session";
import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { type SupabaseClient, type User } from "@supabase/supabase-js";

// --- Helpers Interns (Moguts aquí, no cal exportar-los) ---

async function upsertExpenseDetails(
    supabase: SupabaseClient,
    expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id" | 'expense_attachments' | 'suppliers' | 'expense_items'>, 
    expenseId: string | number | null,
    userId: string,
    teamId: string
    // ✅ Canviem el tipus de retorn, ja no retornem la Expense completa des d'aquí
): Promise<ActionResult<{ id: number }>> { // <-- Retorna només l'ID
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


   // ✅ LOG: Imprimeix les dades exactes que s'enviaran
    console.log("Data being sent to upsertExpenseDetails:", JSON.stringify(expenseData, null, 2));

    const query = expenseId
        ? supabase.from("expenses").update(expenseData).eq("id", expenseId)
        : supabase.from("expenses").insert({ ...expenseData, user_id: userId, team_id: teamId });

    // ✅ Mantenim .select('id').single()
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

    // Filtrem IDs vàlids. Els nous (creats al client) tindran IDs temporals (ex: Date.now())
    const existingItemIds = items.map(item => item.id).filter(id => typeof id === 'number' && id > 0);

    // Esborrem els ítems que ja no existeixen a la llista
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

    // Preparem els ítems per a l'upsert
    const itemsToUpsert = items.map(item => ({
        // Si l'ID és temporal (ex: un timestamp llarg), el forcem a null/undefined per a un INSERT
        id: (typeof item.id === 'number' && item.id > 1000000) ? undefined : item.id,
        ...item,
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

// --- Server Actions Públiques (Específiques de [expenseId]) ---

export async function fetchExpenseDetail(expenseId: number): Promise<ExpenseDetail | null> {
    const supabase = createServerActionClient();

    // Determina el nom correcte de la foreign key relationship.
    // Normalment és el nom de la taula relacionada (expense_attachments).
    // Si vas definir un nom específic per a la foreign key, utilitza'l.
    // O pots intentar amb la columna: expense_attachments!inner(expense_id) ??
    // Prova primer amb el nom de la taula:
    const attachmentRelationName = 'expense_attachments'; // O el nom correcte si és diferent

    const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            suppliers (id, nom, nif),
            expense_items (*),
            ${attachmentRelationName}(*) // <-- CANVI: Sintaxi més explícita (prova amb això)
            // Si l'anterior no funciona, prova especificant la columna FK:
            // expense_attachments!expense_id(*) 
        `)
        .eq('id', expenseId)
        .single();

    if (error) {
        console.error("Error fetching expense detail:", error.message);
        // Si l'error persisteix aquí, podria ser un problema més profund
        return null;
    }

    // Comprova si les dades rebudes tenen la forma esperada
    console.log("Data received from fetchExpenseDetail:", data);

    // Assegura't que el tipus ExpenseDetail inclou expense_attachments com un array
    return data as unknown as ExpenseDetail;
}

export async function saveExpenseAction(
    expenseData: ExpenseFormDataForAction,
    expenseId: string | number | null
): Promise<ActionResult<{ id: number | null }>> { // L'ID pot ser null
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    const { expense_items, id: formId, ...dataToUpsert } = expenseData; // Simplifiquem usant ...rest aquí ja que extra_data no existeix
    
    // Assegurem que dataToUpsert no té camps estranys si ExpenseFormDataForAction no és perfecte
    delete (dataToUpsert as Record<string, unknown>).suppliers;
    delete (dataToUpsert as Record<string, unknown>).expense_attachments;
    // Si 'extra_data' no existeix a la BD, elimina'l també:
    // delete (dataToUpsert as any).extra_data; 
        
    const currentId: string | number | null = expenseId ?? (formId !== 'new' ? formId : null) ?? null;

    const expenseResult = await upsertExpenseDetails(supabase, dataToUpsert, currentId, user.id, activeTeamId);
    
    if (!expenseResult.success) {
        // Retornem només l'error, ja no tenim 'data'
       return { success: false, message: expenseResult.message || "Error desconegut en desar." }; 
    }

    // Intentem determinar l'ID resultant
    // Si estàvem editant, tenim l'ID (currentId). Si estàvem creant, NO el tenim (null).
    const resultingExpenseId = typeof currentId === 'number' ? currentId : null;

    // Sincronitzem ítems NOMÉS si tenim un ID (és a dir, si estàvem editant)
    if (resultingExpenseId !== null) {
        const itemsResult = await syncExpenseItems(supabase, resultingExpenseId, expense_items, user, activeTeamId);
        if (!itemsResult.success) {
            // Retornem error d'items, amb l'ID que tenim
            return { success: false, message: itemsResult.message, data: { id: resultingExpenseId } }; 
        }
        // Revalidem la pàgina específica només si editem
        revalidatePath(`/finances/expenses/${resultingExpenseId}`); 
    } else {
        // Si era 'new', no podem sincronitzar items aquí perquè no tenim l'ID
        console.warn("Expense created, but items cannot be synced immediately without the returned ID.");
        // L'usuari haurà de refrescar o tornar a entrar per veure els items desats (si n'hi havia)
    }

    // Sempre revalidem el llistat
    revalidatePath("/finances/expenses"); 

    // Retornem èxit, amb l'ID (que serà null si era INSERT)
    return { success: true, message: "Despesa desada.", data: { id: resultingExpenseId } };
}

export async function uploadAttachmentAction(expenseId: string, formData: FormData): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, message: "No s'ha proporcionat cap fitxer." };

    const filePath = `${activeTeamId}/${expenseId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("despeses-adjunts").upload(filePath, file);
    if (uploadError) return { success: false, message: uploadError.message };

    const { error: dbError } = await supabase.from("expense_attachments").insert({
        expense_id: expenseId as unknown as number,
        user_id: user.id,
        team_id: activeTeamId,
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
    });
    if (dbError) return { success: false, message: dbError.message };

    revalidatePath("/finances/despeses");
    revalidatePath(`/finances/despeses/${expenseId}`);
    return { success: true, message: "Adjunt pujat correctament." };
}

export async function deleteExpense(expenseId: number): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

    if (error) {
        console.error("Error deleting expense:", error.message);
        return { success: false, message: `Error al eliminar la despesa: ${error.message}` };
    }

    revalidatePath("/finances/despeses");
    return { success: true, message: `Despesa eliminada correctament.` };
}