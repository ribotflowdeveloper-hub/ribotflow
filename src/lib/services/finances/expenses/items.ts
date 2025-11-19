import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { type DbTableInsert } from '@/types/db'; // ✅ Import necessari
import { type ExpenseItem, type TaxRate } from '@/types/finances/index';
import crypto from 'crypto'; // Assegura't que tens això si uses randomUUID al servidor (Node)

// Helper local
function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regex.test(id);
}

export async function fetchExpenseItemsWithTaxes(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    teamId: string
): Promise<ExpenseItem[]> {
    // 1. Obtenir items
    const { data: itemsData, error: itemsError } = await supabase
        .from('expense_items')
        .select('*')
        .eq('expense_id', expenseId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

    if (itemsError) throw new Error(itemsError.message);
    if (!itemsData || itemsData.length === 0) return [];

    // 2. Obtenir impostos
    const itemIds = itemsData.map(item => item.id);
    const { data: taxesData, error: taxesError } = await supabase
        .from('expense_item_taxes')
        .select(`*, tax_rates (*)`)
        .in('expense_item_id', itemIds)
        .eq('team_id', teamId);
        
    if (taxesError) throw new Error(taxesError.message);

    // 3. Mapejar
    return itemsData.map(item => {
        const taxesForItem = taxesData
            ?.filter(tax => tax.expense_item_id === item.id)
            .map(tax => tax.tax_rates as unknown as TaxRate) 
            .filter(Boolean) ?? []; 
            
        return {
            ...item,
            total: (item.quantity || 0) * (item.unit_price || 0), 
            taxes: taxesForItem,
            category_id: item.category_id,
        };
    });
}

export async function syncExpenseItems(
    supabase: SupabaseClient<Database>,
    expenseId: number,
    items: ExpenseItem[] | undefined,
    userId: string,
    teamId: string
): Promise<void> {

    const existingValidUuids = items
        ?.map(item => item.id)
        .filter(isValidUuid)
        .map(id => String(id));

    // 1. DELETE (amb fix manual per PostgREST)
    let deleteQuery = supabase.from('expense_items').delete().eq('expense_id', expenseId);

    if (existingValidUuids && existingValidUuids.length > 0) {
        const filterString = `(${existingValidUuids.join(',')})`;
        deleteQuery = deleteQuery.not('id', 'in', filterString);
    }
    
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new Error(`Error netejant items: ${deleteError.message}`);
    
    if (!items || items.length === 0) return;

    // 2. PREPARE UPSERT
    // ✅ CORRECCIÓ: Tipatge estricte en lloc d'any[]
    const itemsToUpsert: DbTableInsert<'expense_items'>[] = [];
    const taxesToInsert: DbTableInsert<'expense_item_taxes'>[] = [];
    
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
            category_id: item.category_id,
            // Assegura't que aquests camps coincideixen amb la teva BD, si 'legacy_category_name' no existeix a la BD, no l'incloguis
        });
        
        const itemBase = (item.quantity || 0) * (item.unit_price || 0);
        
        if (item.taxes && item.taxes.length > 0) {
            for (const tax of item.taxes) {
                taxesToInsert.push({
                    team_id: teamId,
                    expense_item_id: itemId,
                    tax_rate_id: tax.id,
                    name: tax.name,
                    rate: tax.rate,
                    amount: itemBase * (tax.rate / 100),
                });
            }
        }
    }

    // 3. EXECUTE UPSERT ITEMS
    if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
            .from('expense_items')
            .upsert(itemsToUpsert);
            
        if (upsertError) throw new Error(`Error upsert items: ${upsertError.message}`);
    }
    
    // 4. SYNC TAXES (Delete all old taxes for these items -> Insert new ones)
    const allItemIds = itemsToUpsert.map(i => i.id);
    // Filter out undefined ids just in case, though logic guarantees strings
    const safeIds = allItemIds.filter((id): id is string => typeof id === 'string');

    if (safeIds.length > 0) {
        await supabase.from('expense_item_taxes').delete().in('expense_item_id', safeIds);
        
        if (taxesToInsert.length > 0) {
            await supabase.from('expense_item_taxes').insert(taxesToInsert);
        }
    }
}