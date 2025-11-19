import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { type ExpenseDetail, type ExpenseFormDataForAction } from '@/types/finances/index';
import { type DbTableInsert, type DbTableUpdate } from '@/types/db';
import { fetchExpenseItemsWithTaxes } from './items'; 

export async function fetchExpenseDetail(
    supabase: SupabaseClient<Database>, 
    expenseId: number, 
    teamId: string
): Promise<ExpenseDetail | null> {
    
    // 1. Capçalera
    const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select(`*, suppliers (id, nom, nif), expense_attachments (*)`)
        .eq('id', expenseId)
        .eq('team_id', teamId)
        .single();

    if (expenseError) {
        console.error("[Expenses] fetchExpenseDetail error:", expenseError.message);
        return null; 
    }

    // 2. Items (Deleguem al fitxer items.ts)
    const itemsWithTaxes = await fetchExpenseItemsWithTaxes(supabase, expenseId, teamId);
    
    // Fem un cast segur o reconstruïm l'objecte si calgués, però aquí 'unknown' temporal és acceptable 
    // per fer el merge, sempre que el return sigui ExpenseDetail
    const detail = expenseData as unknown as ExpenseDetail;
    detail.expense_items = itemsWithTaxes;
    
    return detail;
}

export async function upsertExpenseHeader(
    supabase: SupabaseClient<Database>,
    expenseData: Omit<ExpenseFormDataForAction, 'id' | 'expense_items'>,
    expenseId: number | null,
    userId: string,
    teamId: string
): Promise<{ id: number }> {
    
    const formatDate = (d: string | null | undefined) => d ? new Date(d).toISOString().split('T')[0] : null;

    // Creem un objecte base. TypeScript inferirà les propietats.
    const dataToUpsert = {
        ...expenseData,
        expense_date: formatDate(expenseData.expense_date),
        payment_date: formatDate(expenseData.payment_date),
        due_date: formatDate(expenseData.due_date),
        supplier_id: expenseData.supplier_id || null,
        project_id: expenseData.project_id || null,
    };

    // ✅ CORRECCIÓ: Utilitzem Record<string, unknown> en lloc d'any per permetre l'esborrat segur
    const cleanData = dataToUpsert as Record<string, unknown>;

    // Netegem camps virtuals o relacions que no són columnes directes de 'expenses'
    delete cleanData.expense_items;
    delete cleanData.suppliers;
    delete cleanData.expense_attachments;

    let query;

    if (expenseId) {
        // Update: Tipem explícitament com a DbTableUpdate
        query = supabase
            .from("expenses")
            .update(cleanData as DbTableUpdate<'expenses'>)
            .eq("id", expenseId);
    } else {
        // Insert: Afegim user_id i team_id i tipem com a DbTableInsert
        const insertPayload: DbTableInsert<'expenses'> = {
            ...(cleanData as DbTableInsert<'expenses'>),
            user_id: userId,
            team_id: teamId
        };
        query = supabase.from("expenses").insert(insertPayload);
    }

    const { data, error } = await query.select('id').single();

    if (error) throw new Error(`Error desant capçalera: ${error.message}`);
    // Validem que data no sigui null (tot i que .single() + error check sol ser suficient)
    if (!data) throw new Error("No s'ha retornat cap ID després de desar.");
    
    return { id: data.id };
}

export async function deleteExpense(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    teamId: string
): Promise<void> {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('team_id', teamId); 

    if (error) throw new Error(`Error eliminant despesa: ${error.message}`);
}