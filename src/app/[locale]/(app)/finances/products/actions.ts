// /app/[locale]/(app)/crm/products/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type PaginatedActionParams } from '@/hooks/usePaginateResource';

// ✅ 1. Importem el NOU servei
import * as productService from '@/lib/services/finances/products/products.service';

// ✅ 2. Importem els tipus NOMÉS PER A ÚS INTERN
import type { 
  ProductPageFilters, 
  FormState, 
  PaginatedProductsData,

} from '@/lib/services/finances/products/products.service';

// ❌ TOTS ELS 'export type' S'HAN ELIMINAT

// --- Acció per Obtenir Dades Paginades ---
export async function fetchPaginatedProducts(
  params: PaginatedActionParams<ProductPageFilters>
): Promise<PaginatedProductsData> {

  const session = await validateUserSession();
  if ("error" in session) {
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;

  return await productService.getPaginatedProducts(supabase, activeTeamId, params);
}

// --- Acció per Obtenir Categories Úniques (Cache) ---
export async function getUniqueProductCategories(): Promise<string[]> {
  const session = await validateUserSession();
  if ("error" in session) return [];
  
  return productService.getUniqueProductCategories(session.activeTeamId);
}

// --- Funcions CRUD (per a useFormState) ---

export async function createProduct(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  const result = await productService.createProduct(supabase, user.id, activeTeamId, formData);

  if (result.success) {
    revalidatePath('/crm/products');
  }

  return result;
}

export async function deleteProduct(id: number): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  const result = await productService.deleteProduct(supabase, id);

  if (result.success) {
    revalidatePath('/crm/products');
  }

  return result;
}