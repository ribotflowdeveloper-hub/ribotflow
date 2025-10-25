
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateUserSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';
import {
  type PaginatedActionParams,
  type PaginatedResponse
} from '@/hooks/usePaginateResource'; // Tipus genèrics
import { unstable_cache as cache } from 'next/cache';
import { createAdminClient } from "@/lib/supabase/admin"; // Client admin per cache
import { createClient } from "@/lib/supabase/client"; // Client de servidor per a page.tsx  
// --- Tipus Específics ---
export type Product = Database['public']['Tables']['products']['Row'];

// Filtres per a la pàgina de productes (TFilters)
export interface ProductPageFilters {
  category: string | 'all';
}

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

// Esquema de Zod per al formulari (el que rep ProductForm)
const productSchema = z.object({
  name: z.string().min(3, 'El nom ha de tenir almenys 3 caràcters.'),
  price: z.coerce.number().positive('El preu ha de ser un número positiu.'),
  iva: z.coerce.number().min(0).optional().nullable(),
  discount: z.coerce.number().min(0).max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
  data?: Product | null;
};

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

// --- ✅ NOVA FUNCIÓ (per a ProductForm en mode edició) ---
export async function getProductById(
  id: number
): Promise<{ product: Product | null; error: string | null }> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { product: null, error: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('team_id', activeTeamId) // Assegurem permisos
    .single();

  if (error) {
    return { product: null, error: error.message };
  }
  return { product: data, error: null };
}

// --- ✅ NOVA FUNCIÓ (per a page.tsx) ---
// Defineix l'esquema de validació per als paràmetres de la taula
const tableStateSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  sort: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
});

export async function getProductsList(
  params: z.infer<typeof tableStateSchema>
) {
  // Validem paràmetres (tot i que page.tsx ja ho hauria fet)
  const validation = tableStateSchema.safeParse(params);
  if (!validation.success) {
    // Retornem valors per defecte en cas d'error
    return { data: [], pageCount: 0, error: 'Paràmetres invàlids' };
  }

  const { page, perPage, sort, name, status } = validation.data;

  // Necessitem un client Supabase de servidor per a aquesta funció

  const supabase = createClient();

  const session = await validateUserSession();
  if ('error' in session) {
    return { data: [], pageCount: 0, error: session.error.message };
  }
  const { activeTeamId } = session;

  const offset = (page - 1) * perPage;
  const [sortField, sortOrder] = sort?.split('.') || ['created_at', 'desc'];

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('team_id', activeTeamId);

  // 1. Aplicar Filtres
  if (name) {
    query = query.ilike('name', `%${name}%`);
  }
  if (status) {
    query = query.eq('is_active', status === 'active');
  }

  // 2. Aplicar Ordenació
  query = query.order(sortField, { ascending: sortOrder === 'asc' });

  // 3. Aplicar Paginació
  query = query.range(offset, offset + perPage - 1);

  // Executar la consulta
  const { data, error, count } = await query;

  if (error) {
    return { data: [], pageCount: 0, error: error.message };
  }

  const pageCount = count ? Math.ceil(count / perPage) : 0;

  return { data, pageCount, error: null };
}