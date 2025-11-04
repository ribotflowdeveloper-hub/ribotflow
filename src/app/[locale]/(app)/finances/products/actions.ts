// /app/[locale]/(app)/crm/products/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type PaginatedActionParams } from '@/hooks/usePaginateResource';

// ✅ 1. Importem el NOU servei
import * as productService from '@/lib/services/finances/products/products.service';
import { redirect } from 'next/navigation'; // 👈 1. Importar redirect
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

/**
 * ACCIÓ: Elimina un producte.
 * Aquesta és la versió corregida.
 */
export async function deleteProduct(productId: number): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  
  // 1. Obtenim el client 'supabase' autenticat.
  // No necessitem 'activeTeamId' per a la crida.
  const { supabase } = session;

  // 2. ✅ CRIDA CORREGIDA: Cridem al servei només amb (supabase, id)
  const result = await productService.deleteProduct(supabase, productId);

  if (result.success) {
    // 3. Si té èxit, revalidem la memòria cau de la PÀGINA DE LLISTA.
    revalidatePath('/finances/products'); 
    
    // 4. Important: NO revalidem la pàgina de detall [productId]
    //    perquè ja no existeix.

  } else {
    // Si el servei retorna un error, el passem al client
    return { success: false, message: result.message };
  }

  // 5. REDIRECCIÓ DES DEL SERVIDOR:
  // Un cop eliminat i revalidat, redirigim l'usuari a la llista.
  // Això evita la "cursa" (race condition) i el 404.
  redirect(`/finances/products`);
}