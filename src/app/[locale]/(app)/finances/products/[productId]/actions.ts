"use server";

import { revalidatePath } from "next/cache";
import { 
  validateSessionAndPermission,
  validateActionAndUsage // ✅ Necessitem aquest
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions"; // ✅ Necessitem aquest
import { redirect } from 'next/navigation'; // ✅ Necessitem aquest

import * as productService from '@/lib/services/finances/products/products.service';
import type { 
  Product,
  FormState
} from '@/lib/services/finances/products/products.service';

/**
 * ACCIÓ: Obté el detall d'un producte
 */
export async function fetchProductDetail(productId: number): Promise<Product> {
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) { 
        throw new Error(session.error.message); 
    }
    const { supabase, activeTeamId } = session;
    return await productService.fetchProductDetail(supabase, activeTeamId, productId);
}

/**
 * ACCIÓ: Crea un nou producte (usat per ProductSelector i ProductDetailClient)
 */
export async function createProduct(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
    // ✅ Validació de CREACIÓ (Permís + Límit)
    const limitToCheck: PlanLimit = 'maxProducts';
    const validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_PRODUCTS,
      limitToCheck
    );

    if ('error' in validation) {
        return { success: false, message: validation.error.message };
    }
    const { supabase, user, activeTeamId } = validation;

    // ✅ Passem el 'tax_ids' al servei
    const taxIds = formData.get('tax_ids') as string || '';
    
    const result = await productService.createProduct(supabase, user.id, activeTeamId, formData, taxIds);

    if (result.success) {
        revalidatePath('/finances/products');
        revalidatePath('/finances/invoices'); // Per actualitzar selectors
        revalidatePath('/finances/quotes'); // Per actualitzar selectors
    }
    
    return result;
}

/**
 * ACCIÓ: Actualitza un producte existent
 */
export async function updateProduct(
  id: number,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_PRODUCTS);
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session; // ✅ Necessitem activeTeamId

    // ✅ Passem el 'tax_ids' al servei
    const taxIds = formData.get('tax_ids') as string || '';

    const result = await productService.updateProduct(supabase, activeTeamId, id, formData, taxIds);

    if (result.success) {
        revalidatePath('/finances/products');
        revalidatePath(`/finances/products/${id}`);
        revalidatePath('/finances/invoices');
        revalidatePath('/finances/quotes');
    }
    
    return result;
}

/**
 * ACCIÓ: Esborra un producte
 */
export async function deleteProduct(id: number): Promise<FormState> {
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_PRODUCTS);
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    const result = await productService.deleteProduct(supabase, id);

    if (result.success) {
        revalidatePath('/finances/products');
        // Redirigim des de l'acció
        redirect('/finances/products'); 
    }
    return result;
}