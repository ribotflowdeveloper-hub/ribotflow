import { 
    type SupabaseClient, 
} from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
// ✅ 1. Importem crypto per generar UUIDs
import crypto from 'crypto'; 
import { 
    type Expense, 
    type ExpenseItem,
    type ExpenseDetail,
    type ExpenseFormDataForAction,
    type ExpenseAttachment
} from '@/types/finances/expenses';
import { type DbTableInsert, type DbTableUpdate } from '@/types/db';
import { createAdminClient } from "@/lib/supabase/admin";

// ---
// ⚙️ FUNCIONS DE SERVEI (DETALL I MUTACIONS)
// ---

// ✅ Helper per validar si un string és un UUID
function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(id);
}


/**
 * SERVEI: Processa un OCR (Edge Function).
 */
export async function processOcr(
    supabase: SupabaseClient<Database>,
    formData: FormData,
): Promise<Record<string, unknown>> {
    const file = formData.get("file") as File | null;
    if (!file) {
        throw new Error("No s'ha proporcionat cap fitxer.");
    }

    const { data, error } = await supabase.functions.invoke("process-ocr", {
        body: { file_name: file.name, file_type: file.type },
    });

    if (error) {
        throw new Error(error.message);
    }
    return data;
}

/**
 * SERVEI: Obté despeses per a un proveïdor (per a la pestanya de proveïdors).
 */
export async function fetchExpensesForSupplier(
    supabase: SupabaseClient<Database>,
    supplierId: string,
    teamId: string,
) {
    const { data, error } = await supabase
        .from("expenses")
        .select("id, expense_date, description, total_amount, status")
        .eq("supplier_id", supplierId)
        .eq("team_id", teamId)
        .order("expense_date", { ascending: false })
        .limit(50);

    if (error) {
        console.error(
            "Error fetching expenses for supplier (service):",
            error.message,
        );
        return []; 
    }
    return data;
}

/**
 * SERVEI: Cerca despeses per vincular (per al modal de proveïdors).
 */
export async function searchExpensesForLinking(
    supabase: SupabaseClient<Database>,
    teamId: string,
    searchTerm: string,
): Promise<
    Pick<Expense, "id" | "description" | "expense_date" | "total_amount">[]
> {
    let query = supabase
        .from("expenses")
        .select("id, description, expense_date, total_amount")
        .eq("team_id", teamId)
        .is("supplier_id", null)
        .order("expense_date", { ascending: false })
        .limit(10);

    if (searchTerm) {
        query = query.ilike("description", `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error(
            "Error searching expenses for linking (service):",
            error.message,
        );
        return [];
    }
    return data || [];
}

/**
 * SERVEI: Vincula una despesa a un proveïdor.
 * Llança un error si falla.
 */
export async function linkExpenseToSupplier(
    supabase: SupabaseClient<Database>,
    teamId: string,
    expenseId: number,
    supplierId: string,
): Promise<Expense> {
    const { data, error } = await supabase
        .from("expenses")
        .update({ supplier_id: supplierId })
        .eq("id", expenseId)
        .eq("team_id", teamId)
        .select()
        .single();

    if (error) {
        console.error("Error linking expense (service):", error);
        throw new Error(`Error en vincular la despesa: ${error.message}`);
    }
    return data as Expense;
}

/**
 * SERVEI: Desvincula una despesa d'un proveïdor.
 * Llança un error si falla.
 */
export async function unlinkExpenseFromSupplier(
    supabase: SupabaseClient<Database>,
    teamId: string,
    expenseId: number,
): Promise<void> {
    const { error } = await supabase
        .from("expenses")
        .update({ supplier_id: null })
        .eq("id", expenseId)
        .eq("team_id", teamId);

    if (error) {
        console.error("Error unlinking expense (service):", error);
        throw new Error(`Error en desvincular la despesa: ${error.message}`);
    }
}

/**
 * SERVEI: Obté el detall complet d'una despesa.
 * Llança un error si falla.
 */
export async function fetchExpenseDetail(
    supabase: SupabaseClient<Database>, 
    expenseId: number, 
    teamId: string
): Promise<ExpenseDetail | null> {
    const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            suppliers (id, nom, nif),
            expense_items (*),
            expense_attachments (*)
        `)
        .eq('id', expenseId)
        .eq('team_id', teamId) // Seguretat
        .single();

    if (error) {
        console.error("Error fetching expense detail (service):", error.message);
        return null; 
    }
    return data as unknown as ExpenseDetail;
}


// --- Helpers Interns per a 'saveExpense' ---

async function upsertExpenseDetails(
    supabase: SupabaseClient<Database>,
    expenseData: Omit<ExpenseFormDataForAction, 'id' | 'expense_items'>,
    expenseId: number | null,
    userId: string,
    teamId: string
): Promise<{ id: number }> {
    
    const expenseDate = expenseData.expense_date ? new Date(expenseData.expense_date).toISOString().split('T')[0] : null;
    const paymentDate = expenseData.payment_date ? new Date(expenseData.payment_date).toISOString().split('T')[0] : null;

    const dataToUpsert = {
        ...expenseData,
        expense_date: expenseDate,
        payment_date: paymentDate,
        supplier_id: expenseData.supplier_id || null,
        project_id: expenseData.project_id || null,
    };

    delete (dataToUpsert as Record<string, unknown>).suppliers;
    delete (dataToUpsert as Record<string, unknown>).expense_attachments;

    const query = expenseId
        ? supabase.from("expenses").update(dataToUpsert as DbTableUpdate<'expenses'>).eq("id", expenseId)
        : supabase.from("expenses").insert({ ...dataToUpsert, user_id: userId, team_id: teamId } as DbTableInsert<'expenses'>);

    const { data, error } = await query.select('id').single();

    if (error) {
        console.error("Error upserting expense (service):", error);
        throw new Error(`Error en desar la despesa: ${error.message}`);
    }
    if (!data || typeof data.id !== 'number') {
        throw new Error("Error en desar: ID no retornat.");
    }
    return { id: data.id };
}

async function syncExpenseItems(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    items: ExpenseItem[] | undefined,
    userId: string,
    teamId: string
): Promise<void> {
    if (!items || items.length === 0) {
        const { error: deleteError } = await supabase.from('expense_items').delete().eq('expense_id', expenseId);
        if (deleteError) {
            throw new Error(`Error netejant conceptes antics: ${deleteError.message}`);
        }
        return;
    }

    // (Correcció anterior) Filtrar només per UUIDs vàlids
    const existingValidUuids = items
        .map(item => item.id)
        .filter(isValidUuid) 
        .map(id => `'${id}'`); 

    let deleteQuery = supabase
        .from('expense_items')
        .delete()
        .eq('expense_id', expenseId);

    if (existingValidUuids.length > 0) {
        // (Correcció anterior) Consulta .not() amb UUIDs vàlids
        deleteQuery = deleteQuery.not('id', 'in', `(${existingValidUuids.join(',')})`);
    }
    
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
        throw new Error(`Error esborrant conceptes: ${deleteError.message}`);
    }

    // ✅ *** CORRECCIÓ APLICADA ***
    const itemsToUpsert = items.map(item => {
        // És nou si no és un UUID vàlid
        const isNew = !isValidUuid(item.id); 

        return {
            // ✅ CORRECCIÓ 1: Si no és nou, fem cast a 'string' per a TypeScript
            id: isNew ? crypto.randomUUID() : String(item.id), 
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            // total: item.total, // <-- ELIMINAT! (Error anterior)
            expense_id: expenseId,
            user_id: userId,
            team_id: teamId,
            // ✅ CORRECCIÓ 2: 'tax_rate' ELIMINAT (no existeix al tipus ExpenseItem)
            // tax_rate: item.tax_rate ?? null, 
        };
    });
    
    // ✅ CORRECCIÓ 3: Donem tipus a 'itemsToUpsert' per evitar l'error de 'number'
    const { error: upsertError } = await supabase
        .from("expense_items")
        .upsert(itemsToUpsert as DbTableInsert<'expense_items'>[], { 
            onConflict: 'id', 
            ignoreDuplicates: false 
        });

    if (upsertError) {
        console.error("Error upserting items (service):", upsertError);
        throw new Error(`Error actualitzant conceptes: ${upsertError.message}`);
    }
}

/**
 * SERVEI: Desa una despesa i els seus ítems (Cas d'Ús).
 * Llança un error si falla.
 */
export async function saveExpense(
    supabase: SupabaseClient<Database>,
    expenseData: ExpenseFormDataForAction,
    expenseId: string | number | null, // ID de la URL
    userId: string,
    teamId: string
): Promise<{ id: number }> { // Retorna l'ID resultant
    const { expense_items, id: formId, ...dataToUpsert } = expenseData;

    const currentId: number | null = (typeof expenseId === 'number') 
        ? expenseId 
        : (typeof formId === 'number' && formId > 0 ? formId : null);

    // 1. Desar la despesa principal
    const { id: resultingExpenseId } = await upsertExpenseDetails(supabase, dataToUpsert, currentId, userId, teamId);

    // 2. Sincronitzar els ítems
    await syncExpenseItems(supabase, resultingExpenseId, expense_items, userId, teamId);

    return { id: resultingExpenseId };
}

/**
 * SERVEI: Puja un adjunt.
 * Llança un error si falla.
 */
export async function uploadAttachment(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    formData: FormData,
    userId: string,
    teamId: string
): Promise<ExpenseAttachment> {
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No s'ha proporcionat cap fitxer.");

    const filePath = `${teamId}/${expenseId}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
        .from("despeses-adjunts")
        .upload(filePath, file);
        
    if (uploadError) {
        console.error("Storage upload error (service):", uploadError);
        throw new Error(`Error de Storage: ${uploadError.message}`);
    }

    const attachmentData: DbTableInsert<'expense_attachments'> = {
        expense_id: expenseId,
        user_id: userId,
        team_id: teamId,
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
    };

    const { data: dbData, error: dbError } = await supabase
        .from("expense_attachments")
        .insert(attachmentData)
        .select()
        .single();
        
    if (dbError) {
        console.error("DB insert error after upload (service):", dbError);
        await supabase.storage.from("despeses-adjunts").remove([filePath]);
        throw new Error(`Error de BD: ${dbError.message}`);
    }
    return dbData as ExpenseAttachment;
}

/**
 * SERVEI: Elimina una despesa (i ítems/adjunts en cascada).
 * Llança un error si falla.
 */
export async function deleteExpense(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    teamId: string
): Promise<void> {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('team_id', teamId); // Seguretat

    if (error) {
        console.error("Error deleting expense (service):", error.message);
        throw new Error(`Error al eliminar la despesa: ${error.message}`);
    }
}

/**
 * SERVEI: Obté una URL signada per a un adjunt.
 * Llança un error si falla.
 */
export async function getAttachmentSignedUrl(
    filePath: string,
    userTeamId: string
): Promise<string> {
    const fileTeamId = filePath.split('/')[0];
    if (userTeamId !== fileTeamId) {
        throw new Error("Accés denegat.");
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
        .from('despeses-adjunts')
        .createSignedUrl(filePath, 60 * 5); // 5 minuts

    if (error) {
        throw new Error(error.message);
    }
    return data.signedUrl;
}

/**
 * SERVEI: Elimina un adjunt (fitxer i registre BBDD).
 * Llança un error si falla.
 */
export async function deleteAttachment(
    supabase: SupabaseClient<Database>,
    adminSupabase: SupabaseClient<Database>, // Client Admin
    attachmentId: string, 
    filePath: string,
    teamId: string
): Promise<void> {
    const { error: dbError } = await supabase
        .from('expense_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('team_id', teamId);

    if (dbError) {
        console.error("Error deleting attachment from DB (service):", dbError);
        throw new Error(`Error esborrant adjunt de la BD: ${dbError.message}`);
    }

    const { error: storageError } = await adminSupabase.storage
        .from('despeses-adjunts')
        .remove([filePath]);

    if (storageError) {
        console.error("Error deleting attachment from Storage (service):", storageError);
        throw new Error(`Error esborrant fitxer de Storage: ${storageError.message}`);
    }
}