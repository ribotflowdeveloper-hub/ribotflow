import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { type DbTableInsert } from '@/types/db';
import { type ExpenseItemForm, type TaxRate } from '@/types/finances/index';

export async function fetchExpenseItemsWithTaxes(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    teamId: string
): Promise<ExpenseItemForm[]> {
    // 1. Items
    const { data: itemsData, error: itemsError } = await supabase
        .from('expense_items')
        .select('*')
        .eq('expense_id', expenseId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

    if (itemsError) throw new Error(itemsError.message);
    if (!itemsData || itemsData.length === 0) return [];

    // 2. Impostos
    const itemIds = itemsData.map(item => item.id);
    const { data: taxesData, error: taxesError } = await supabase
        .from('expense_item_taxes')
        .select(`*, tax_rates (*)`)
        .in('expense_item_id', itemIds)
        .eq('team_id', teamId);
        
    if (taxesError) throw new Error(taxesError.message);

    // 3. Mapeig
    return itemsData.map(item => {
        const taxesForItem = taxesData
            ?.filter(tax => tax.expense_item_id === item.id)
            // IMPORTANT: Assegurem-nos que el map retorna TaxRate vàlid
            .map(tax => {
                // Si tax_rates és un array o objecte, l'extraiem
                const rateData = Array.isArray(tax.tax_rates) ? tax.tax_rates[0] : tax.tax_rates;
                // Retornem un objecte que compleix TaxRate
                return rateData ? {
                    id: rateData.id,
                    name: rateData.name,
                    percentage: rateData.percentage,
                    is_default: false 
                } as TaxRate : null;
            })
            .filter((t): t is TaxRate => t !== null) ?? [];
            
        return {
            ...item,
            quantity: item.quantity ?? 0,
            unit_price: item.unit_price ?? 0,
            taxes: taxesForItem,
            id: item.id 
        };
    });
}

export async function syncExpenseItems(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    items: ExpenseItemForm[] | undefined,
    userId: string,
    teamId: string
): Promise<void> {
    if (!items) return;

    // 1. Identificar IDs existents (UUIDs vàlids)
    const existingIds = items
        .map(i => i.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 10);

    // 2. Esborrar items que ja no hi són
    let deleteQuery = supabase.from('expense_items').delete().eq('expense_id', expenseId);
    if (existingIds.length > 0) {
        // Nota: PostgREST espera (id1,id2) per al filtre 'in' quan són UUIDs
        // O millor, usem .in() amb un array directament, que la llibreria JS gestiona millor
        deleteQuery = supabase.from('expense_items').delete()
            .eq('expense_id', expenseId)
            .not('id', 'in', `(${existingIds.join(',')})`); 
            // Si això falla, prova: .filter('id', 'not.in', `(${existingIds.join(',')})`)
    }
    await deleteQuery;

    if (items.length === 0) return;

    // 3. Preparar dades per Upsert
    const itemsToUpsert: DbTableInsert<'expense_items'>[] = [];
    const taxesToInsert: DbTableInsert<'expense_item_taxes'>[] = [];

    for (const item of items) {
        const isNew = typeof item.id === 'number' || String(item.id).length < 10;
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

        const baseAmount = item.quantity * item.unit_price;
        
        if (item.taxes?.length) {
            for (const tax of item.taxes) {
                taxesToInsert.push({
                    team_id: teamId,
                    expense_item_id: itemId,
                    tax_rate_id: String(tax.id), // Convertim tax.id a string per evitar errors de tipus
                    name: tax.name,
                    rate: tax.percentage,
                    amount: baseAmount * (tax.percentage / 100)
                });
            }
        }
    }

    // 4. Executar Upsert Items
    if (itemsToUpsert.length > 0) {
        const { error } = await supabase.from('expense_items').upsert(itemsToUpsert);
        if (error) throw new Error(`Error upsert items: ${error.message}`);
    }

    // 5. Sincronitzar Taxes
    // ✅ CORRECCIÓ FINAL: TypeScript es queixava de (string | undefined)[]
    // Fem un filter amb Type Guard per garantir string[]
    const allItemIds = itemsToUpsert
        .map(i => i.id)
        .filter((id): id is string => id !== undefined);
        
    if (allItemIds.length > 0) {
        await supabase.from('expense_item_taxes').delete().in('expense_item_id', allItemIds);
        if (taxesToInsert.length > 0) {
            await supabase.from('expense_item_taxes').insert(taxesToInsert);
        }
    }
}