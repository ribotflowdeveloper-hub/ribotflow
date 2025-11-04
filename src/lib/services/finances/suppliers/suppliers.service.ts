// src/lib/services/finances/suppliers/suppliers.service.ts (FITXER NOU)
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database, type Tables } from '@/types/supabase';
import { type ActionResult } from "@/types/shared/actionResult";
import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource';
import { notFound } from 'next/navigation';

// --- Tipus Públics del Servei ---

export type Supplier = Tables<'suppliers'>;
export type SupplierFormData = Omit<Supplier, 'id' | 'created_at' | 'user_id' | 'team_id'>;

// Filtres per a la pàgina
export type SupplierPageFilters = object;

// Tipus per al hook de paginació
type FetchSuppliersParams = PaginatedActionParams<SupplierPageFilters>;
export type PaginatedSuppliersData = PaginatedResponse<Supplier>;

// ---
// ⚙️ FUNCIONS DE LECTURA (LLISTA)
// ---

/**
 * SERVEI: Obté proveïdors paginats.
 */
/**
 * SERVEI: Obté proveïdors paginats.
 */
export async function getPaginatedSuppliers(
  supabase: SupabaseClient<Database>,
  teamId: string,
  params: FetchSuppliersParams
): Promise<PaginatedSuppliersData> {
  const { searchTerm, sortBy, sortOrder, limit, offset } = params;

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId)
    .order(sortBy || 'nom', { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (searchTerm) {
    query = query.or(`nom.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching paginated suppliers (service):", error);
    return { data: [], count: 0 };
  }

  return {
    data: data || [],
    count: count ?? 0
  };
}

/**
 * SERVEI: Obté la llista completa de proveïdors (per a selectors).
 */
export async function fetchSuppliers(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, nom')
    .eq('team_id', teamId) // ✅ Afegim filtre de teamId
    .order('nom', { ascending: true });
    
  if (error) {
    console.error("Error fetching suppliers list (service):", error.message);
    return [];
  }
  return data || [];
}

/**
 * SERVEI: Cerca proveïdors per nom per al combobox asíncron.
 */
export async function searchSuppliers(
  supabase: SupabaseClient<Database>,
  teamId: string,
  searchTerm: string
): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
  let query = supabase
    .from('suppliers')
    .select('id, nom')
    .eq('team_id', teamId) // ✅ Afegim filtre de teamId
    .order('nom', { ascending: true })
    .limit(20);
    
  if (searchTerm) query = query.ilike('nom', `%${searchTerm}%`);
  
  const { data, error } = await query;
  if (error) { 
    console.error("Error searching suppliers (service):", error.message); 
    return []; 
  }
  return data || [];
}

/**
 * SERVEI: Obté el detall d'un únic proveïdor.
 */
export async function fetchSupplierDetail(
  supabase: SupabaseClient<Database>,
  teamId: string,
  id: string
): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .eq('team_id', teamId)
    .single();

  if (error) {
    console.error("Error fetching supplier detail (service):", error.message);
    notFound(); // Llança un 404 si hi ha error o no es troba
  }
  return data;
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (CRUD)
// ---

/**
 * SERVEI: Desa (crea o actualitza) un proveïdor.
 */
export async function saveSupplier(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string,
  formData: SupplierFormData,
  supplierId: string | null
): Promise<ActionResult<Supplier>> {
  const isNew = supplierId === null || supplierId === 'new';

  try {
    if (isNew) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...formData, user_id: userId, team_id: teamId })
        .select()
        .single();
      if (error) throw error;
      return { success: true, message: "Proveïdor creat amb èxit.", data: data as Supplier };
    } else {
      const { data, error } = await supabase
        .from('suppliers')
        .update(formData)
        .eq('id', supplierId)
        .eq('team_id', teamId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, message: "Proveïdor actualitzat amb èxit.", data: data as Supplier };
    }
  } catch (e) {
    const error = e as Error;
    console.error("Unexpected error saving supplier (service):", error);
    return { success: false, message: `Un error inesperat ha ocorregut: ${error.message}` };
  }
}

/**
 * SERVEI: Esborra un proveïdor.
 */
export async function deleteSupplier(
  supabase: SupabaseClient<Database>,
  teamId: string,
  supplierId: string
): Promise<ActionResult> {
  // 1. Comprovem si hi ha despeses associades
  const { count: expenseCount, error: expenseError } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', supplierId)
    .eq('team_id', teamId);

  if (expenseError) {
    console.error("Error checking related expenses (service):", expenseError);
    return { success: false, message: "Error en comprovar despeses relacionades." };
  }

  if (expenseCount && expenseCount > 0) {
    return { success: false, message: `No es pot eliminar. Hi ha ${expenseCount} despesa(es) associada(es).` };
  }

  // 2. Si no hi ha despeses, procedim a eliminar
  const { error: deleteError } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId)
    .eq('team_id', teamId);

  if (deleteError) {
    console.error("Error deleting supplier (service):", deleteError);
    return { success: false, message: `Error esborrant proveïdor: ${deleteError.message}` };
  }

  return { success: true, message: "Proveïdor esborrat amb èxit." };
}