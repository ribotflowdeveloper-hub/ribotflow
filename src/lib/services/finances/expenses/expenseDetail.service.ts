// src/lib/services/finances/expenses/expenseDetail.service.ts

import { 
    type SupabaseClient, 
} from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import crypto from 'crypto'; 
import { 
    type Expense,
    type ExpenseItem,
    type ExpenseDetail,
    type ExpenseFormDataForAction,
    type ExpenseAttachment,
    type TaxRate
} from '@/types/finances/index'; 
import { type DbTableInsert, type DbTableUpdate } from '@/types/db';
import { createAdminClient } from "@/lib/supabase/admin";

// Helper per validar si un string és un UUID
function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(id);
}

/**
 * ✅✅✅
 * SERVEI: Obté el detall complet d'una despesa (REFACTORITZAT)
 * ✅✅✅
 * Ara llegeix de 'expense_item_taxes' i popula 'item.taxes'
 */
export async function fetchExpenseDetail(
    supabase: SupabaseClient<Database>, 
    expenseId: number, 
    teamId: string
): Promise<ExpenseDetail | null> {
    
    // 1. Obtenim la despesa principal, proveïdor i adjunts
    const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select(`
            *,
            suppliers (id, nom, nif),
            expense_attachments (*)
        `)
        .eq('id', expenseId)
        .eq('team_id', teamId)
        .single();

    if (expenseError) {
        console.error("Error fetching expense detail (service):", expenseError.message);
        return null; 
    }

    // 2. Obtenim els 'items' de la despesa
    const { data: itemsData, error: itemsError } = await supabase
        .from('expense_items')
        .select('*')
        .eq('expense_id', expenseId)
        .eq('team_id', teamId);

    if (itemsError) {
        console.error("Error fetching expense items (service):", itemsError.message);
        throw new Error(itemsError.message);
    }
    
    const detail = expenseData as unknown as ExpenseDetail;
    
    if (!itemsData || itemsData.length === 0) {
        detail.expense_items = [];
        return detail;
    }

    // 3. Obtenim ELS IMPOSTOS de tots els items alhora
    const itemIds = itemsData.map(item => item.id);
    const { data: taxesData, error: taxesError } = await supabase
        .from('expense_item_taxes')
        .select(`
            *,
            tax_rates (*) 
        `)
        .in('expense_item_id', itemIds)
        .eq('team_id', teamId);
        
    if (taxesError) {
        console.error("Error fetching item taxes (service):", taxesError.message);
        throw new Error(taxesError.message);
    }

    // 4. Mapegem els impostos als seus items
    const itemsWithTaxes: ExpenseItem[] = itemsData.map(item => {
        const taxesForItem = taxesData
            ?.filter(tax => tax.expense_item_id === item.id)
            .map(tax => tax.tax_rates as TaxRate) 
            .filter(Boolean) ?? []; 
            
        return {
            ...item,
            total: (item.quantity || 0) * (item.unit_price || 0), // Calculem el total
            taxes: taxesForItem
        };
    });
    
    // 5. Unim-ho tot i retornem
    detail.expense_items = itemsWithTaxes;
    
    return detail;
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
    const dueDate = expenseData.due_date ? new Date(expenseData.due_date).toISOString().split('T')[0] : null;

    const dataToUpsert = {
        ...expenseData,
        expense_date: expenseDate,
        payment_date: paymentDate,
        due_date: dueDate,
        supplier_id: expenseData.supplier_id || null,
        project_id: expenseData.project_id || null,
    };

    delete (dataToUpsert as Record<string, unknown>).suppliers;
    delete (dataToUpsert as Record<string, unknown>).expense_attachments;
    delete (dataToUpsert as Record<string, unknown>).expense_items;

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

/**
 * ✅✅✅
 * AQUESTA ÉS LA FUNCIÓ CORREGIDA FINAL
 * ✅✅✅
 * Soluciona l'error "failed to parse filter" formatant manualment (uuid1,uuid2)
 */
async function syncExpenseItems(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    items: ExpenseItem[] | undefined,
    userId: string,
    teamId: string
): Promise<void> {

    // 1. Obtenir els UUIDs vàlids (sense cometes extra)
    const existingValidUuids = items
        ?.map(item => item.id)
        .filter(isValidUuid)
        .map(id => String(id)); // Assegurem que és string net

    let deleteQuery = supabase
        .from('expense_items')
        .delete()
        .eq('expense_id', expenseId);

    // 2. Construir el filtre NOT IN manualment
    if (existingValidUuids && existingValidUuids.length > 0) {
        // ⚠️ CORRECCIÓ CLAU:
        // PostgREST necessita el format (uuid1,uuid2).
        // Ho construïm nosaltres mateixos per evitar errors de la llibreria.
        const filterString = `(${existingValidUuids.join(',')})`;
        
        deleteQuery = deleteQuery.not('id', 'in', filterString);
    }
    
    // Executem l'esborrat
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
        throw new Error(`Error esborrant conceptes antics: ${deleteError.message}`);
    }
    
    // Si no hi ha items nous per afegir, acabem
    if (!items || items.length === 0) return;

    // 3. Preparar 'items' i 'impostos' per a un 'upsert' massiu
    const itemsToUpsert = [];
    const taxesToInsert = [];
    
    for (const item of items) {
        const isNew = !isValidUuid(item.id);
        const itemId = isNew ? crypto.randomUUID() : String(item.id);
        
        itemsToUpsert.push({
            id: itemId,
            expense_id: expenseId,
            user_id: userId,
            team_id: teamId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
        });
        
        const itemBase = (item.quantity || 0) * (item.unit_price || 0);
        
        if (item.taxes && item.taxes.length > 0) {
            for (const tax of item.taxes) {
                const taxAmount = itemBase * (tax.rate / 100);
                
                taxesToInsert.push({
                    team_id: teamId,
                    expense_item_id: itemId,
                    tax_rate_id: tax.id,
                    name: tax.name,
                    rate: tax.rate,
                    amount: taxAmount,
                });
            }
        }
    }

    // 4. Executar 'upsert' d'items
    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
            .from('expense_items')
            .upsert(itemsToUpsert);
        
        if (upsertError) {
            console.error("Error upserting items (service):", upsertError);
            throw new Error(`Error fent upsert d'items: ${upsertError.message}`);
        }
    }
    
    // 5. Sincronitzar Impostos (Esborrar antics + Inserir nous)
    // Això és necessari perquè un 'upsert' d'items no esborra automàticament 
    // els impostos antics que ja no apliquen si l'ID de l'item es manté.
    const allItemIds = itemsToUpsert.map(i => i.id);
    if (allItemIds.length > 0) {
        // Primer netegem els impostos existents per a aquests items
        const { error: deleteTaxesError } = await supabase
            .from('expense_item_taxes')
            .delete()
            .in('expense_item_id', allItemIds);
        
        if (deleteTaxesError) {
             console.error("Error deleting old taxes for upsert (service):", deleteTaxesError);
            throw new Error(`Error netejant impostos antics: ${deleteTaxesError.message}`);
        }
    }

    // 6. Inserir tots els nous impostos
    if (taxesToInsert.length > 0) {
        const { error: insertTaxesError } = await supabase
            .from('expense_item_taxes')
            .insert(taxesToInsert);
        
        if (insertTaxesError) {
            console.error("Error inserting new taxes (service):", insertTaxesError);
            throw new Error(`Error inserint nous impostos: ${insertTaxesError.message}`);
        }
    }
}

export async function saveExpense(
    supabase: SupabaseClient<Database>,
    expenseData: ExpenseFormDataForAction,
    expenseId: string | number | null, 
    userId: string,
    teamId: string
): Promise<{ id: number }> {
    const { expense_items, id: formId, ...dataToUpsert } = expenseData;

    const currentId: number | null = (typeof expenseId === 'number') 
        ? expenseId 
        : (typeof formId === 'number' && formId > 0 ? formId : null);

    // 1. Desar la despesa principal
    const { id: resultingExpenseId } = await upsertExpenseDetails(supabase, dataToUpsert, currentId, userId, teamId);

    // 2. Sincronitzar els ítems i els seus impostos
    await syncExpenseItems(supabase, resultingExpenseId, expense_items, userId, teamId);

    return { id: resultingExpenseId };
}


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

    // ✅✅✅ CORRECCIÓ ERROR 1 (ts2561)
    // El teu esquema té 'user_id' i 'filename' (sense guió baix)
    const attachmentData: DbTableInsert<'expense_attachments'> = {
        expense_id: expenseId,
        user_id: userId, // <-- CORREGIT (no 'uploaded_by')
        team_id: teamId,
        file_path: filePath,
        filename: file.name, // <-- CORREGIT (ha de coincidir amb la BD, el teu tenia 'filename')
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
    return dbData as unknown as ExpenseAttachment;
}


export async function deleteExpense(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    teamId: string
): Promise<void> {
    // Esborrar la despesa esborrarà en cascada items i impostos d'items
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('team_id', teamId); 

    if (error) {
        console.error("Error deleting expense (service):", error.message);
        throw new Error(`Error al eliminar la despesa: ${error.message}`);
    }
    
    // TODO: Esborrar adjunts de Storage (això no es fa en cascada)
    // Hauries de llistar els 'expense_attachments' abans d'esborrar la despesa
    // i després esborrar-los de 'despeses-adjunts'.
}


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
        .createSignedUrl(filePath, 60 * 5); 

    if (error) {
        throw new Error(error.message);
    }
    return data.signedUrl;
}


export async function deleteAttachment(
    supabase: SupabaseClient<Database>,
    adminSupabase: SupabaseClient<Database>,
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

// ---
// ⚙️ FUNCIONS QUE FALTAVEN (AFEGIDES)
// ---

/**
 * ⚠️ DEPRECATED: Aquesta funció ha estat substituïda per 'analyzeInvoiceFileAction'
 */
export async function processOcr(
    supabase: SupabaseClient<Database>,
    formData: FormData,
): Promise<Record<string, unknown>> {
    console.warn("DEPRECATION: 'processOcr' service is deprecated. Use 'analyzeInvoiceFileAction' instead.");
    const file = formData.get("file") as File | null;
    if (!file) {
        throw new Error("No s'ha proporcionat cap fitxer.");
    }

    const { data, error } = await supabase.functions.invoke("processar-factura", {
        body: formData, // L'Edge Function hauria de gestionar FormData
    });

    if (error) {
        throw new Error(error.message);
    }
    return data;
}

/**
 * SERVEI: Obté despeses per a un proveïdor.
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
        console.error("Error fetching expenses for supplier (service):", error.message);
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
        console.error("Error searching expenses for linking (service):", error.message);
        return [];
    }
    return data || [];
}

/**
 * SERVEI: Vincula una despesa a un proveïdor.
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
        .select() // Això retorna la fila actualitzada
        .single();

    if (error) {
        console.error("Error linking expense (service):", error);
        throw new Error(`Error en vincular la despesa: ${error.message}`);
    }
    // Gràcies a arreglar el tipus 'Expense' (Pas 1), aquest 'cast' ara és segur
    return data as Expense;
}

/**
 * SERVEI: Desvincula una despesa d'un proveïdor.
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