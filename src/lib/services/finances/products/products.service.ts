// src/lib/services/finances/products.service.ts (COMPLET I CORREGIT)
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database, type Tables } from '@/types/supabase';
import { type DbTableInsert } from '@/types/db';
import { 
  type PaginatedActionParams, 
  type PaginatedResponse 
} from '@/hooks/usePaginateResource';
import { unstable_cache as cache } from 'next/cache';
import { createAdminClient } from "@/lib/supabase/admin";
// ✅ Assegura't que aquest import és correcte segons la teva estructura
import { productSchema } from '@/app/[locale]/(app)/finances/products/schemas'; 
import { notFound } from 'next/navigation';

// --- Tipus Públics del Servei ---

export type Product = Tables<'products'>;
// ✅ Tipus extès per incloure els impostos de la taula pivot
export type ProductWithTaxes = Product & {
  product_taxes: { tax_rate_id: string }[];
};

// Filtres per a la pàgina (TFilters)
export interface ProductPageFilters {
  category: string | 'all';
}

export type FormState = { 
  success: boolean;
  message: string;
  data?: ProductWithTaxes; // ✅ Utilitzem el tipus extès
  errors?: Record<string, string[]>; 
};

// Tipus per al hook de paginació
type FetchProductsParams = PaginatedActionParams<ProductPageFilters>;
export type PaginatedProductsData = PaginatedResponse<Product>;

// ---
// ⚙️ FUNCIONS DE LECTURA (LLISTA I FILTRES)
// ---

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

export async function getUniqueProductCategories(teamId: string): Promise<string[]> {
  return getCachedUniqueProductCategories(teamId);
}

export async function getActiveProducts(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<Product[]> { 
  const { data, error } = await supabase
    .from('products')
    .select('*') // Podries afegir ', product_taxes(tax_rate_id)' si cal
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error service(getActiveProducts):', error.message);
    return [];
  }
  return (data as Product[]) || [];
}

export async function fetchProductDetail(
  supabase: SupabaseClient<Database>,
  teamId: string,
  productId: number
): Promise<ProductWithTaxes> {
  // ✅ CORRECCIÓ: Treiem l'espai i els salts de línia innecessaris
  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_taxes(tax_rate_id)')
    .eq('id', productId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching product detail (service):", error);
    throw new Error("No s'ha pogut carregar el producte.");
  }
  if (!product) {
    notFound();
  }
  // El 'cast' és segur ara que la consulta és correcta
  return product as ProductWithTaxes;
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (CRUD)
// ---

async function _syncProductTaxes(
    supabase: SupabaseClient<Database>,
    productId: number,
    teamId: string,
    taxIdsString: string 
) {
    const taxIds = taxIdsString ? taxIdsString.split(',') : [];

    const { error: deleteError } = await supabase
        .from('product_taxes')
        .delete()
        .eq('product_id', productId)
        .eq('team_id', teamId);
        
    if (deleteError) {
        console.error("Error esborrant impostos antics:", deleteError);
        throw new Error(`Error esborrant impostos antics: ${deleteError.message}`);
    }

    if (taxIds.length > 0) {
        const taxesToInsert: DbTableInsert<'product_taxes'>[] = taxIds.map(taxId => ({
            product_id: productId,
            tax_rate_id: taxId,
            team_id: teamId
        }));
        
        const { error: insertError } = await supabase
            .from('product_taxes')
            .insert(taxesToInsert);
            
        if (insertError) {
            console.error("Error inserint nous impostos:", insertError);
            throw new Error(`Error inserint nous impostos: ${insertError.message}`);
        }
    }
}

export async function createProduct(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string,
  formData: FormData,
  taxIds: string 
): Promise<FormState> {

  const rawData = Object.fromEntries(formData.entries());
  
  // Eliminem 'tax_ids' de l'objecte abans de validar-lo
  delete rawData.tax_ids; 

  const validatedFields = productSchema.safeParse({
    ...rawData,
    is_active: formData.get('is_active') === 'on',
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Errors de validació.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // 1. Inserir el producte
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
  
  let productWithTaxes: ProductWithTaxes;

  // 2. Sincronitzar els impostos
  try {
    await _syncProductTaxes(supabase, newProduct.id, teamId, taxIds);
    // 3. Tornem a demanar el producte amb els impostos
    productWithTaxes = await fetchProductDetail(supabase, teamId, newProduct.id);
  } catch (taxError: unknown) {
     return {
      success: false,
      message: `Producte creat, però error en desar impostos: ${(taxError as Error).message}`,
      data: { ...newProduct, product_taxes: [] }, 
    };
  }

  return {
    success: true,
    message: 'Producte creat correctament.',
    data: productWithTaxes, 
  };
}

export async function updateProduct(
  supabase: SupabaseClient<Database>,
  teamId: string, 
  id: number,
  formData: FormData,
  taxIds: string 
): Promise<FormState> {
  
  const rawData = Object.fromEntries(formData.entries());
  
  delete rawData.tax_ids; 

  const validatedFields = productSchema.safeParse({
    ...rawData,
    is_active: formData.get('is_active') === 'on',
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Errors de validació.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // 1. Actualitzar el producte
  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update(validatedFields.data)
    .eq('id', id)
    .eq('team_id', teamId) 
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: `Error en actualitzar el producte: ${error.message}`,
    };
  }
  
  let productWithTaxes: ProductWithTaxes;

  // 2. Sincronitzar els impostos
  try {
    await _syncProductTaxes(supabase, updatedProduct.id, teamId, taxIds);
    // 3. Tornem a demanar el producte amb els impostos
    productWithTaxes = await fetchProductDetail(supabase, teamId, updatedProduct.id);
  } catch (taxError: unknown) {
     return {
      success: false,
      message: `Producte actualitzat, però error en desar impostos: ${(taxError as Error).message}`,
      data: { ...updatedProduct, product_taxes: [] },
    };
  }

  return {
    success: true,
    message: 'Producte actualitzat correctament.',
    data: productWithTaxes, 
  };
}

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