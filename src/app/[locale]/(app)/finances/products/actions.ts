// /src/app/[locale]/(app)/finances/products/actions.ts (CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
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

// ... (fetchPaginatedProducts i getUniqueProductCategories es queden igual) ...

export async function fetchPaginatedProducts(
  params: PaginatedActionParams<ProductPageFilters>
): Promise<PaginatedProductsData> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { data: [], count: 0 };
  }
  const { supabase, activeTeamId } = session;
  return await productService.getPaginatedProducts(supabase, activeTeamId, params);
}
export async function getUniqueProductCategories(): Promise<string[]> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return [];
  return productService.getUniqueProductCategories(session.activeTeamId);
}

// --- Funcions CRUD (per a useFormState) ---

export async function createProduct(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const limitToCheck: PlanLimit = 'maxProducts';
  const session = await validateActionAndUsage(
    PERMISSIONS.MANAGE_PRODUCTS,
    limitToCheck
  );
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, user, activeTeamId } = session;

  // ✅✅✅ INICI DE LA CORRECCIÓ ✅✅✅
  // El 'ProductSelector' només envia 'name' i 'price'.
  // El nostre 'productSchema' espera 'tax_rate'.
  // L'assignem aquí un valor per defecte abans de validar,
  // per evitar l'error "Introdueix un número."
  
  // 1. Comprovem si 'tax_rate' ve del formulari.
  const taxRateFromForm = formData.get('tax_rate');

  // 2. Si no ve (és el cas del ProductSelector), li posem '0' (o 0.21 si prefereixes).
  // '0' és més segur. '0.21' és el valor per defecte a Espanya. Tria tu.
  // Jo posaré '0' (com a string, ja que és FormData) per a més seguretat.
  if (taxRateFromForm === null) {
    formData.set('tax_rate', '0'); 
  }
  // ✅✅✅ FI DE LA CORRECCIÓ ✅✅✅

  // Ara la validació de 'productService.createProduct' rebrà el 'tax_rate'
  // i 'z.coerce.number()' funcionarà correctament.
  const result = await productService.createProduct(supabase, user.id, activeTeamId, formData);

  if (result.success) {
    // Hem de revalidar tant 'crm' com 'finances' si les rutes conviuen
    revalidatePath('/crm/products'); 
    revalidatePath('/finances/products');
    // Important: També revalidem l'editor de 'quotes' perquè
    // el 'ProductSelector' tingui la nova llista!
    revalidatePath('/crm/quotes/[id]', 'page');
    revalidatePath('/finances/quotes/[id]', 'page');
  }

  return result;
}

// ... (deleteProduct es queda igual) ...
export async function deleteProduct(productId: number): Promise<FormState> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_PRODUCTS);
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  const result = await productService.deleteProduct(supabase, productId);

  if (result.success) {
    revalidatePath('/finances/products');
    revalidatePath('/crm/products'); // Revalidem les dues
  } else {
    return { success: false, message: result.message };
  }
  
  // Redirigim a la llista principal
  redirect(`/finances/products`);
}