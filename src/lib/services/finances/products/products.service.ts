// src/lib/services/finances/products.service.ts (COMPLET I CORREGIT)
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database, type Tables } from '@/types/supabase';
import { type Product as DbProduct } from '@/types/db';
import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource';
import { unstable_cache as cache } from 'next/cache';
import { createAdminClient } from "@/lib/supabase/admin";
// ✅ Importem l'schema des de la seva nova ubicació
import { productSchema } from '@/app/[locale]/(app)/finances/products/schemas'; 
import { notFound } from 'next/navigation';

// --- Tipus Públics del Servei ---

export type Product = Tables<'products'>;

// Filtres per a la pàgina (TFilters)
export interface ProductPageFilters {
  category: string | 'all';
}

// ✅ Tipus de retorn per als formularis (MOGUT DES DE 'schemas.ts')
export type FormState = { 
  success: boolean;
  message: string;
  data?: Product;
  errors?: Record<string, string[]>; 
};

// Tipus per al hook de paginació
type FetchProductsParams = PaginatedActionParams<ProductPageFilters>;
export type PaginatedProductsData = PaginatedResponse<Product>;

// ---
// ⚙️ FUNCIONS DE LECTURA (LLISTA I FILTRES)
// ---

/**
 * SERVEI: Obté productes paginats.
 */
export async function getPaginatedProducts(
  supabase: SupabaseClient<Database>,
  teamId: string,
  params: FetchProductsParams
): Promise<PaginatedProductsData> {
  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId)
    .order(sortBy || 'name', { ascending: sortOrder === 'asc' });

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching paginated products (service):", error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
}

/**
 * SERVEI: Obté categories úniques (Cache).
 */
const getCachedUniqueProductCategories = cache(
  async (activeTeamId: string): Promise<string[]> => {
    const supabaseAdmin = createAdminClient();
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
    const isString = (s: string | null): s is string => typeof s === 'string';
    const uniqueCategories = [...new Set(data.map((item) => item.category).filter(isString))];
    return uniqueCategories.sort();
  },
  ['product_categories_by_team'],
  { tags: ["filters", "products"] }
);

/**
 * SERVEI: Funció pública per cridar la cau de categories.
 */
export async function getUniqueProductCategories(teamId: string): Promise<string[]> {
  return getCachedUniqueProductCategories(teamId);
}

/**
 * SERVEI: Obté tots els productes actius (per a selectors).
 */
export async function getActiveProducts(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<DbProduct[]> { 
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
  return (data as DbProduct[]) || [];
}

/**
 * ✅ NOU SERVEI: Obté el detall d'un producte per ID.
 * (Mogut des de [productId]/actions.ts)
 */
export async function fetchProductDetail(
  supabase: SupabaseClient<Database>,
  teamId: string,
  productId: number
): Promise<Product> {
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching product detail (service):", error);
    throw new Error("No s'ha pogut carregar el producte.");
  }
  if (!product) {
    notFound(); // Correcte: el servei pot llançar notFound
  }
  return product;
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (CRUD)
// ---

/**
 * SERVEI: Crea un nou producte.
 */
export async function createProduct(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string,
  formData: FormData
): Promise<FormState> {
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
      user_id: userId,
      team_id: teamId,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: `Error en crear el producte: ${error.message}`,
    };
  }

  return {
    success: true,
    message: 'Producte creat correctament.',
    data: newProduct,
  };
}

/**
 * ✅ NOU SERVEI: Actualitza un producte existent.
 * (Mogut des de [productId]/actions.ts)
 */
export async function updateProduct(
  supabase: SupabaseClient<Database>,
  id: number,
  formData: FormData
): Promise<FormState> {
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

  return {
    success: true,
    message: 'Producte actualitzat correctament.',
    data: updatedProduct,
  };
}

/**
 * SERVEI: Elimina un producte.
 */
export async function deleteProduct(
  supabase: SupabaseClient<Database>,
  id: number
): Promise<FormState> {
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    return {
      success: false,
      message: `Error en eliminar el producte: ${error.message}`,
    };
  }

  return { success: true, message: 'Producte eliminat correctament.' };
}