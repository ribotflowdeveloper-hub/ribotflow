// /app/[locale]/(app)/crm/products/[productId]/actions.ts (FITXER CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 1. Importem el NOU servei
import * as productService from '@/lib/services/finances/products/products.service';

// ✅ 2. Importem els tipus NOMÉS PER A ÚS INTERN
import type { 
  Product,
  FormState
} from '@/lib/services/finances/products/products.service';

// ❌ TOTS ELS 'export type' I IMPORTS DE 'schemas' S'HAN ELIMINAT

/**
 * ACCIÓ: Obté les dades d'un producte específic per ID.
 */
export async function fetchProductDetail(productId: number): Promise<Product> {
    const session = await validateUserSession();
    if ('error' in session) { 
        throw new Error(session.error.message); 
    }
    const { supabase, activeTeamId } = session;

    // Crida al servei
    return await productService.fetchProductDetail(supabase, activeTeamId, productId);
}

/**
 * ACCIÓ: Actualitza un producte existent.
 */
export async function updateProduct(
  id: number, // L'ID es passa com a primer argument (bind)
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    // Crida al servei
    const result = await productService.updateProduct(supabase, id, formData);

    // La revalidació es queda a l'acció
    if (result.success) {
        revalidatePath('/crm/products');
        revalidatePath(`/crm/products/${id}`);
    }
    
    return result;
}