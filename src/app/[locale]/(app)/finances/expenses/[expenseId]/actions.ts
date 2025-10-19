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
    expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id">,
    expenseId: string | number | null,
    userId: string,
    teamId: string
): Promise<ActionResult<Expense>> {
    if (expenseData.expense_date) {
        try {
            expenseData.expense_date = new Date(expenseData.expense_date).toISOString().split('T')[0];
        } catch (e) {
            console.error("Error al formatar la data:", e);
            return { success: false, message: "Format de data invàlid." };
        }
    }

    // ✅ Assegurem que camps numèrics que poden ser null s'envien com a null
    expenseData.supplier_id = expenseData.supplier_id || null;
    expenseData.project_id = expenseData.project_id || null;

    const query = expenseId
        ? supabase.from("expenses").update(expenseData).eq("id", expenseId)
        : supabase.from("expenses").insert({ ...expenseData, user_id: userId, team_id: teamId });

    const { data, error } = await query.select().single();

    if (error) {
        console.error("Error upserting expense:", error);
        return { success: false, message: error.message };
    }

    return { success: true, message: "Despesa desada correctament.", data: data as Expense };
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

    return data as unknown as ExpenseDetail;
}

export async function saveExpenseAction(
    expenseData: ExpenseFormDataForAction,
    expenseId: string | number | null
): Promise<ActionResult<Expense>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    const { expense_items, id: formId, ...rest } = expenseData;
    const currentId: string | number | null = expenseId ?? (formId !== 'new' ? formId : null) ?? null;

    const expenseResult = await upsertExpenseDetails(supabase, rest, currentId, user.id, activeTeamId);
    if (!expenseResult.success || !expenseResult.data) {
        return expenseResult;
    }

    const newExpenseId = expenseResult.data.id as number;
    const itemsResult = await syncExpenseItems(supabase, newExpenseId, expense_items, user, activeTeamId);
    if (!itemsResult.success) {
        return { success: false, message: itemsResult.message, data: expenseResult.data };
    }

    revalidatePath("/finances/despeses");
    if (newExpenseId) {
        revalidatePath(`/finances/despeses/${newExpenseId}`);
    }

    return { success: true, message: "Despesa desada amb èxit.", data: expenseResult.data };
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

// Dins de .../expenses/[expenseId]/actions.ts
import { createAdminClient } from '@/lib/supabase/admin'; // Important: Admin client!

export async function getAttachmentSignedUrl(filePath: string): Promise<ActionResult<{ signedUrl: string }>> {
    // Validació de sessió i permisos aquí...
    const session = await validateUserSession(); 
    if ("error" in session) return { success: false, message: session.error.message };

    // Comprovació addicional: L'usuari té permís per accedir a aquest fitxer específic?
    // (Ex: Verificant que el team_id a filePath coincideix amb l'activeTeamId de l'usuari)
    const userTeamId = session.activeTeamId;
    const fileTeamId = filePath.split('/')[0]; // Assumeix que la ruta comença amb teamId
    if (userTeamId !== fileTeamId) {
         return { success: false, message: "Accés denegat." };
    }

    const supabaseAdmin = createAdminClient(); // Necessites credencials d'admin per signar URLs
    const { data, error } = await supabaseAdmin.storage
        .from('despeses-adjunts')
        .createSignedUrl(filePath, 60); // URL vàlida per 60 segons

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true, message: "URL signada generada correctament.", data: { signedUrl: data.signedUrl } };
}