"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
// ✅ 1. Importem els guardians
import { 
  validateSessionAndPermission,
  validateActionAndUsage
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import { type PaginatedActionParams } from '@/hooks/usePaginateResource';
import * as productService from '@/lib/services/finances/products/products.service';
import type { 
  ProductPageFilters, 
  FormState, 
  PaginatedProductsData,
} from '@/lib/services/finances/products/products.service';

// --- Acció per Obtenir Dades Paginades ---
export async function fetchPaginatedProducts(
  params: PaginatedActionParams<ProductPageFilters>
): Promise<PaginatedProductsData> {

  // ✅ 2. Validació de VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;

  return await productService.getPaginatedProducts(supabase, activeTeamId, params);
}

// --- Acció per Obtenir Categories Úniques (Cache) ---
export async function getUniqueProductCategories(): Promise<string[]> {
  // ✅ 3. Validació de VISTA
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return [];
  
  // Passem 'activeTeamId' que ve de la sessió validada
  return productService.getUniqueProductCategories(session.activeTeamId);
}

// --- Funcions CRUD (per a useFormState) ---

export async function createProduct(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // ✅ 4. Validació de CREACIÓ (Permís + Límit)
  const limitToCheck: PlanLimit = 'maxProducts';
  const session = await validateActionAndUsage(
    PERMISSIONS.MANAGE_PRODUCTS,
    limitToCheck
  );
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  const result = await productService.createProduct(supabase, user.id, activeTeamId, formData);

  if (result.success) {
    revalidatePath('/crm/products'); // Compte! La ruta és /crm/products
  }

  return result;
}

/**
 * ACCIÓ: Elimina un producte.
 */
export async function deleteProduct(productId: number): Promise<FormState> {
  // ✅ 5. Validació de GESTIÓ
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_PRODUCTS);
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  const result = await productService.deleteProduct(supabase, productId);

  if (result.success) {
    // La teva ruta de revalidació és /finances/products, però l'acció és a /crm/products
    // Assegura't que sigui la correcta. Deixaré la que tenies.
    revalidatePath('/finances/products'); 
  } else {
    return { success: false, message: result.message };
  }

  // La teva ruta de redirecció és /finances/products
  redirect(`/finances/products`);
}