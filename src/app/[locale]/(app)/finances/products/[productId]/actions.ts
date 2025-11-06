"use server";

import { revalidatePath } from "next/cache";
// ✅ 1. Importem els guardians
import { 
  validateSessionAndPermission
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";

import * as productService from '@/lib/services/finances/products/products.service';
import type { 
  Product,
  FormState
} from '@/lib/services/finances/products/products.service';

/**
 * ACCIÓ: Obté les dades d'un producte específic per ID.
 */
export async function fetchProductDetail(productId: number): Promise<Product> {
    // ✅ 2. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) { 
        throw new Error(session.error.message); 
    }
    const { supabase, activeTeamId } = session;

    return await productService.fetchProductDetail(supabase, activeTeamId, productId);
}

/**
 * ACCIÓ: Actualitza un producte existent.
 */
export async function updateProduct(
  id: number,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
    // ✅ 3. Validació de GESTIÓ (No cal límit en actualitzar)
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_PRODUCTS);
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    const result = await productService.updateProduct(supabase, id, formData);

    if (result.success) {
        revalidatePath('/crm/products');
        revalidatePath(`/crm/products/${id}`);
    }
    
    return result;
}