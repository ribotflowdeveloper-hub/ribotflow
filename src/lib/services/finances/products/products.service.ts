// src/lib/services/finances/products.service.ts
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Product } from '@/types/db';
import { type Database } from '@/types/supabase';

/**
 * SERVEI: Obté tots els productes actius (per a selectors).
 * La consulta és la que teníem a 'InvoiceDetailData.tsx'.
 */
export async function getActiveProducts(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<Product[]> {
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error service(getActiveProducts):', error.message);
    return [];
  }
  return (data as Product[]) || [];
}