
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';
// ✅ Importem ActionResult des del seu lloc
import {
  type PaginatedActionParams,
  type PaginatedResponse
} from '@/hooks/usePaginateResource';
import { unstable_cache as cache } from 'next/cache';
import { createAdminClient } from "@/lib/supabase/admin";
// ✅ Importem l'schema i el tipus FormState des del nou fitxer
import { productSchema } from './schemas';

// --- Tipus Específics ---
export type Product = Database['public']['Tables']['products']['Row'];

// Filtres per a la pàgina de productes (TFilters)
export interface ProductPageFilters {
  category: string | 'all';
}
// ✅ FORMA CORRECTA (afegint 'export')
export type FormState = { 
  success: boolean;
  message: string;
  data?: Product; // Assegura't que 'Product' estigui importat o definit aquí
  errors?: Record<string, string[]>; 
};
// Alias per al hook genèric
type FetchProductsParams = PaginatedActionParams<ProductPageFilters>;
type PaginatedProductsData = PaginatedResponse<Product>; // Directament Product, no necessitem joins complexos ara

// --- Acció per Obtenir Dades Paginades ---
export async function fetchPaginatedProducts(
  params: FetchProductsParams
): Promise<PaginatedProductsData> {

  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  const session = await validateUserSession();
  if ("error" in session) return { data: [], count: 0 };
  const { supabase, activeTeamId } = session;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' }) // Seleccionem tot per ara
    .eq('team_id', activeTeamId)
    // .eq('is_active', true) // Apliquem filtre actiu aquí si sempre es vol
    .order(sortBy || 'name', { ascending: sortOrder === 'asc' }); // Ordenació per defecte

  // Filtre per categoria
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  // Filtre per terme de cerca (nom o descripció)
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  // Paginació
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching paginated products:", error);
    // throw new Error("Error en carregar els productes.");
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

// --- Acció per Obtenir Categories Úniques (Cache) ---
const getCachedUniqueProductCategories = cache(
  async (activeTeamId: string): Promise<string[]> => {
    const supabaseAdmin = createAdminClient();
    console.log(`[Cache Miss] Fetching product categories for team ${activeTeamId}`);
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('category')
      .eq('team_id', activeTeamId)
      .not('category', 'is', null)
      .not('category', 'eq', '');

    if (error) {
      console.error(`Error fetching product categories (Admin):`, error.message);
      return [];
    }
    const uniqueCategories = [...new Set(data.map((item) => item.category).filter(Boolean))];
    console.log(`[Cache Miss] Processed product categories (Admin):`, uniqueCategories);
    return uniqueCategories.sort();
  },
  ['product_categories_by_team'],
  { tags: ["filters", "products"] }
);

export async function getUniqueProductCategories(): Promise<string[]> {
  const session = await validateUserSession();
  if ("error" in session) return [];
  return getCachedUniqueProductCategories(session.activeTeamId);
}

// --- Funcions CRUD (ja les tenies) ---

export async function createProduct(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  const validatedFields = productSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    is_active: formData.get('is_active') === 'on',
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Errors de validació.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { data: newProduct, error } = await supabase
    .from('products')
    .insert({
      ...validatedFields.data,
      user_id: user.id,
      team_id: activeTeamId,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: `Error en crear el producte: ${error.message}`,
    };
  }

  revalidatePath('/crm/products');
  return {
    success: true,
    message: 'Producte creat correctament.',
    data: newProduct,
  };
}

export async function updateProduct(
  id: number,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  const validatedFields = productSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    is_active: formData.get('is_active') === 'on',
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Errors de validació.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update(validatedFields.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: `Error en actualitzar el producte: ${error.message}`,
    };
  }

  revalidatePath('/crm/products');
  revalidatePath(`/crm/products/${id}`);
  return {
    success: true,
    message: 'Producte actualitzat correctament.',
    data: updatedProduct,
  };
}

export async function deleteProduct(id: number): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    return {
      success: false,
      message: `Error en eliminar el producte: ${error.message}`,
    };
  }

  revalidatePath('/crm/products');
  return { success: true, message: 'Producte eliminat correctament.' };
}

