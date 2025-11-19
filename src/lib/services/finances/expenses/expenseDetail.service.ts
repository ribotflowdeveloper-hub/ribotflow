// src/lib/services/finances/expenses/expenseDetail.service.ts

import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { 
    type Expense,
    type ExpenseItem,
    type ExpenseDetail,
    type ExpenseFormDataForAction,
    type ExpenseAttachment,
    type TaxRate
} from '@/types/finances/index'; 
import { type DbTableInsert} from '@/types/db';
import { createAdminClient } from "@/lib/supabase/admin";

// --- Helpers ---

/**
 * Valida si un string té format UUID v4.
 * Útil per distingir entre IDs temporals de React (timestamp) i IDs reals de BD.
 */
function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(id);
}

// --- Funcions Principals ---

/**
 * Obté el detall complet d'una despesa, incloent proveïdor, adjunts, items i els seus impostos.
 * Utilitza Promise.all o consultes optimitzades per evitar waterfalls excessius.
 */
export async function fetchExpenseDetail(
    supabase: SupabaseClient<Database>, 
    expenseId: number, 
    teamId: string
): Promise<ExpenseDetail | null> {
    
    // 1. Obtenim la despesa principal (amb relacions directes)
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
        console.error("[Service] fetchExpenseDetail - Error fetching expense:", expenseError.message);
        return null; 
    }

    // 2. Obtenim els items (conceptes)
    const { data: itemsData, error: itemsError } = await supabase
        .from('expense_items')
        .select('*')
        .eq('expense_id', expenseId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true }); // Important per mantenir l'ordre visual

    if (itemsError) {
        console.error("[Service] fetchExpenseDetail - Error fetching items:", itemsError.message);
        throw new Error(itemsError.message);
    }
    
    const detail = expenseData as unknown as ExpenseDetail;
    
    if (!itemsData || itemsData.length === 0) {
        detail.expense_items = [];
        return detail;
    }

    // 3. Obtenim tots els impostos relacionats amb aquests items en una sola query
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
        console.error("[Service] fetchExpenseDetail - Error fetching item taxes:", taxesError.message);
        throw new Error(taxesError.message);
    }

    // 4. Reconstruïm l'objecte en memòria (mapeig)
    const itemsWithTaxes: ExpenseItem[] = itemsData.map(item => {
        const taxesForItem = taxesData
            ?.filter(tax => tax.expense_item_id === item.id)
            .map(tax => tax.tax_rates as unknown as TaxRate) 
            .filter(Boolean) ?? []; 
            
        return {
            ...item,
            // Recalculem total per consistència, tot i que la UI ho fa
            total: (item.quantity || 0) * (item.unit_price || 0), 
            taxes: taxesForItem,
            category_id: item.category_id,
        };
    });
    
    detail.expense_items = itemsWithTaxes;
    
    return detail;
}

/**
 * Desa (Insereix o Actualitza) una despesa i gestiona tota la complexitat
 * dels items i els impostos associats.
 */
export async function saveExpense(
    supabase: SupabaseClient<Database>,
    expenseData: ExpenseFormDataForAction,
    expenseId: string | number | null, 
    userId: string,
    teamId: string
): Promise<{ id: number }> {
    // Separem les dades de la capçalera de les dades relacionades (items)
    const { expense_items, id: formId, ...dataToUpsert } = expenseData;

    // Determinem l'ID real
    const currentId: number | null = (typeof expenseId === 'number') 
        ? expenseId 
        : (typeof formId === 'number' && formId > 0 ? formId : null);

    // 1. Desar la despesa principal (Header)
    const { id: resultingExpenseId } = await upsertExpenseHeader(
        supabase, 
        dataToUpsert, 
        currentId, 
        userId, 
        teamId
    );

    // 2. Sincronitzar els ítems (Línies) i els seus impostos
    await syncExpenseItems(
        supabase, 
        resultingExpenseId, 
        expense_items, 
        userId, 
        teamId
    );

    return { id: resultingExpenseId };
}

// --- Helpers Interns (Privats o Exportats si cal testar) ---

async function upsertExpenseHeader(
    supabase: SupabaseClient<Database>,
    expenseData: Omit<ExpenseFormDataForAction, 'id' | 'expense_items'>,
    expenseId: number | null,
    userId: string,
    teamId: string
): Promise<{ id: number }> {
    
    // Formatatge de dates per evitar errors de timestamp
    const formatDate = (d: string | null | undefined) => d ? new Date(d).toISOString().split('T')[0] : null;

    const dataToUpsert = {
        ...expenseData,
        expense_date: formatDate(expenseData.expense_date),
        payment_date: formatDate(expenseData.payment_date),
        due_date: formatDate(expenseData.due_date),
        supplier_id: expenseData.supplier_id || null,
        project_id: expenseData.project_id || null,
        // Netegem camps que no són columnes d'aquesta taula
        suppliers: undefined,
        expense_attachments: undefined,
        expense_items: undefined
    };

    // Eliminem propietats undefined explícitament
    const cleanData = JSON.parse(JSON.stringify(dataToUpsert));

    const query = expenseId
        ? supabase.from("expenses").update(cleanData).eq("id", expenseId)
        : supabase.from("expenses").insert({ ...cleanData, user_id: userId, team_id: teamId });

    const { data, error } = await query.select('id').single();

    if (error) {
        console.error("[Service] upsertExpenseHeader - Error:", error);
        throw new Error(`Error en desar la capçalera de la despesa: ${error.message}`);
    }
    if (!data?.id) {
        throw new Error("Error en desar: La base de dades no ha retornat l'ID.");
    }
    return { id: data.id };
}

/**
 * Gestiona la lògica "Diff": Esborra el que sobra, crea el que falta i actualitza el que canvia.
 */
async function syncExpenseItems(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    items: ExpenseItem[] | undefined,
    userId: string,
    teamId: string
): Promise<void> {

    // 1. Identificar UUIDs existents que s'han de MANTENIR
    const existingValidUuids = items
        ?.map(item => item.id)
        .filter(isValidUuid)
        .map(id => String(id));

    // 2. Esborrar items que ja no existeixen al formulari
    let deleteQuery = supabase
        .from('expense_items')
        .delete()
        .eq('expense_id', expenseId);

    if (existingValidUuids && existingValidUuids.length > 0) {
        // ⚠️ CORRECCIÓ CRÍTICA POSTGREST:
        // Supabase-js de vegades falla amb arrays grans o complexos en .not('id', 'in', array).
        // Construir la string manualment `(uuid1,uuid2)` és més segur aquí.
        const filterString = `(${existingValidUuids.join(',')})`;
        deleteQuery = deleteQuery.not('id', 'in', filterString);
    }
    
    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
        throw new Error(`Error esborrant conceptes antics: ${deleteError.message}`);
    }
    
    if (!items || items.length === 0) return;

    // 3. Preparar dades per UPSERT massiu (Items)
    const itemsToUpsert: DbTableInsert<"expense_items">[] = [];
    const taxesToInsert: DbTableInsert<"expense_item_taxes">[] = []; // Els impostos sempre els reinserim per simplicitat (delete + insert)
    
    for (const item of items) {
        const isNew = !isValidUuid(item.id);
        // Si és nou, generem ID al client (service) per poder vincular impostos immediatament
        // Si utilitzéssim auto-gen de BD, necessitaríem fer insert un per un.
        const itemId = isNew ? crypto.randomUUID() : String(item.id);
        
        itemsToUpsert.push({
            id: itemId,
            expense_id: expenseId,
            user_id: userId,
            team_id: teamId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            category_id: item.category_id,
        });
        
        // Càlcul impostos per aquest item
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

    // 4. Executar Upsert d'Items
    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
            .from('expense_items')
            .upsert(itemsToUpsert);
        
        if (upsertError) {
            console.error("[Service] syncExpenseItems - Upsert Error:", upsertError);
            throw new Error(`Error desant els conceptes: ${upsertError.message}`);
        }
    }
    
    // 5. Gestió d'Impostos (Estratègia: Delete All for these Items -> Insert New)
    // Això evita haver de fer diffing complex d'impostos dins d'items.
    const allItemIds = itemsToUpsert.map(i => i.id).filter((id): id is string => typeof id === 'string');
    if (allItemIds.length > 0) {
        const { error: deleteTaxesError } = await supabase
            .from('expense_item_taxes')
            .delete()
            .in('expense_item_id', allItemIds);
        
        if (deleteTaxesError) {
            throw new Error(`Error netejant impostos antics: ${deleteTaxesError.message}`);
        }
    }

    if (taxesToInsert.length > 0) {
        const { error: insertTaxesError } = await supabase
            .from('expense_item_taxes')
            .insert(taxesToInsert);
        
        if (insertTaxesError) {
            throw new Error(`Error inserint nous impostos: ${insertTaxesError.message}`);
        }
    }
}

// --- Gestió d'Adjunts ---

export async function uploadAttachment(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    formData: FormData,
    userId: string,
    teamId: string
): Promise<ExpenseAttachment> {
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No s'ha proporcionat cap fitxer.");

    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${teamId}/${expenseId}/${Date.now()}-${sanitizedName}`;
    
    // 1. Upload Storage
    const { error: uploadError } = await supabase.storage
        .from("despeses-adjunts") 
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });
        
    if (uploadError) {
        console.error("[Service] uploadAttachment - Storage Error:", uploadError);
        throw new Error(`Error pujant fitxer a Storage: ${uploadError.message}`);
    }

    // 2. Insert DB Metadata
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
        // Rollback: Si falla la BD, esborrem el fitxer pujat per no deixar brossa
        await supabase.storage.from("despeses-adjunts").remove([filePath]);
        throw new Error(`Error registrant adjunt a BD: ${dbError.message}`);
    }
    return dbData as unknown as ExpenseAttachment;
}

export async function deleteAttachment(
    supabase: SupabaseClient<Database>,
    adminSupabase: SupabaseClient<Database>, // Necessari per esborrar si RLS és estricte
    attachmentId: string, 
    filePath: string,
    teamId: string
): Promise<void> {
    // 1. Esborrar de BD
    const { error: dbError } = await supabase
        .from('expense_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('team_id', teamId);

    if (dbError) {
        throw new Error(`Error esborrant adjunt de la BD: ${dbError.message}`);
    }

    // 2. Esborrar de Storage
    const { error: storageError } = await adminSupabase.storage
        .from('despeses-adjunts')
        .remove([filePath]);

    if (storageError) {
        console.warn("[Service] Warning: File might remain in storage", storageError);
        // No llencem error aquí per no bloquejar l'usuari, ja que la referència a BD ha desaparegut.
    }
}

export async function getAttachmentSignedUrl(
    filePath: string,
    userTeamId: string
): Promise<string> {
    // Validació de seguretat bàsica de path traversal
    const fileTeamId = filePath.split('/')[0];
    if (userTeamId !== fileTeamId) {
        throw new Error("Accés denegat: No pots accedir a fitxers d'altres equips.");
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
        .from('despeses-adjunts')
        .createSignedUrl(filePath, 60 * 15); // 15 minuts

    if (error) {
        throw new Error(error.message);
    }
    return data.signedUrl;
}

export async function deleteExpense(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    teamId: string
): Promise<void> {
    // L'esborrat en cascada de Postgres (ON DELETE CASCADE) s'hauria d'encarregar dels items.
    // Si no està configurat a la BD, caldria esborrar items manualment primer.
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('team_id', teamId); 

    if (error) {
        throw new Error(`Error al eliminar la despesa: ${error.message}`);
    }
}

// --- Funcions Auxiliars (Proveïdors) ---

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
        console.error("[Service] fetchExpensesForSupplier - Error:", error.message);
        return []; 
    }
    return data;
}

export async function searchExpensesForLinking(
    supabase: SupabaseClient<Database>,
    teamId: string,
    searchTerm: string,
): Promise<Pick<Expense, "id" | "description" | "expense_date" | "total_amount">[]> {
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
    if (error) return [];
    return data || [];
}

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

    if (error) throw new Error(`Error en vincular: ${error.message}`);
    return data as unknown as Expense;
}

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

    if (error) throw new Error(`Error en desvincular: ${error.message}`);
}