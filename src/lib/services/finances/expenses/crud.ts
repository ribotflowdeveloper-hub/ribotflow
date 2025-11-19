import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { 
    type ExpenseDetail, 
    type ExpenseFormDataForAction,
    type ExpenseAttachment,
    type EnrichedExpense // Importem el tipus base
} from '@/types/finances/expenses';
import { type DbTableInsert, type DbTableUpdate } from '@/types/db';
import { fetchExpenseItemsWithTaxes } from './items'; 

// Definim el tipus específic que retorna la nostra consulta de Supabase
type ExpenseQueryResponse = Database['public']['Tables']['expenses']['Row'] & {
    suppliers: { id: string; nom: string | null; nif?: string | null } | null;
    expense_attachments: Database['public']['Tables']['expense_attachments']['Row'][];
};

export async function fetchExpenseDetail(
    supabase: SupabaseClient<Database>, 
    expenseId: number, 
    teamId: string
): Promise<ExpenseDetail | null> {
    
    const { data: expenseData, error } = await supabase
        .from('expenses')
        .select(`*, suppliers (id, nom, nif), expense_attachments (*)`)
        .eq('id', expenseId)
        .eq('team_id', teamId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error("[Expenses] fetchDetail error:", error.message);
        throw error;
    }

    const items = await fetchExpenseItemsWithTaxes(supabase, expenseId, teamId);
    
    // Casting segur
    const rawExpense = expenseData as unknown as ExpenseQueryResponse;

    // Construïm l'objecte final. 
    // Convertim l'ID del supplier a string o number segons el que EnrichedExpense esperi.
    // Si EnrichedExpense espera Pick<Contact, 'id' | 'nom'> i Contact.id és number, 
    // hem de convertir l'UUID del supplier (si és string) o viceversa.
    // Com que Contact.id és number a la teva DB, però suppliers.id és uuid (string), 
    // aquí hi ha un conflicte de tipus. 
    
    // ASSUMPCIÓ: El frontend espera mostrar el nom, l'ID és menys crític per visualització,
    // però per coherència amb els tipus, farem un cast forçat a 'any' per a l'ID del supplier
    // si el tipus Contact diu number però la taula suppliers diu uuid.
    
    const suppliersData = rawExpense.suppliers 
        ? { 
            id: rawExpense.suppliers.id as unknown as number, // Truc per satisfer el tipus Contact.id (number) si és UUID
            nom: rawExpense.suppliers.nom ?? "" // Assegurem que 'nom' sigui sempre string
          } 
        : null;

    const detail: ExpenseDetail = {
        ...(rawExpense as unknown as EnrichedExpense), 
        
        // Sobreescrivim amb les dades processades
        expense_items: items,
        suppliers: suppliersData,
        expense_attachments: (rawExpense.expense_attachments || []) as unknown as ExpenseAttachment[]
    };
    
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

    // Construïm l'objecte NET directament
    const payload = {
        description: expenseData.description,
        total_amount: expenseData.total_amount,
        subtotal: expenseData.subtotal,
        tax_amount: expenseData.tax_amount,
        retention_amount: expenseData.retention_amount,
        discount_amount: expenseData.discount_amount,
        discount_rate: expenseData.discount_rate,
        currency: expenseData.currency,
        
        expense_date: formatDate(expenseData.expense_date)!, 
        due_date: formatDate(expenseData.due_date),
        payment_date: formatDate(expenseData.payment_date),
        
        supplier_id: expenseData.supplier_id || null,
        category_id: expenseData.category_id || null,
        project_id: expenseData.project_id || null,
        
        invoice_number: expenseData.invoice_number,
        notes: expenseData.notes,
        status: expenseData.status,
        payment_method: expenseData.payment_method,
        is_billable: expenseData.is_billable ?? false,
        is_reimbursable: expenseData.is_reimbursable ?? false,
        
        user_id: userId,
        team_id: teamId
    };

    let query;
    if (expenseId) {
        // Update
        query = supabase
            .from("expenses")
            .update(payload as unknown as DbTableUpdate<'expenses'>)
            .eq("id", expenseId);
    } else {
        // Insert
        query = supabase
            .from("expenses")
            .insert(payload as unknown as DbTableInsert<'expenses'>);
    }

    const { data, error } = await query.select('id').single();

    if (error) throw new Error(`Error desant capçalera: ${error.message}`);
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