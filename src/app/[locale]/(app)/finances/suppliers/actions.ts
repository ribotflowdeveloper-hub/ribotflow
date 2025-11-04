// /app/[locale]/(app)/finances/suppliers/actions.ts (FITXER CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/actionResult";
import { type PaginatedActionParams } from '@/hooks/usePaginateResource';

// ✅ 1. Importem el NOU servei
import * as supplierService from '@/lib/services/finances/suppliers/suppliers.service';

// ✅ 2. Importem els tipus NOMÉS PER A ÚS INTERN
import type { 
  Supplier, 
  SupplierFormData,
  SupplierPageFilters,
  PaginatedSuppliersData // ✅ Importem el tipus actualitzat
} from '@/lib/services/finances/suppliers/suppliers.service';

// ❌ TOTS ELS 'export type' S'HAN ELIMINAT

// --- Acció per Obtenir Dades Paginades ---
export async function fetchPaginatedSuppliers(
    params: PaginatedActionParams<SupplierPageFilters>
): Promise<PaginatedSuppliersData> {
    const session = await validateUserSession();
    if ("error" in session) {
        console.error("Session error fetching suppliers:", session.error);
        return { data: [], count: 0 };
    }
    const { supabase, activeTeamId } = session;

    try {
        // El servei ja retorna el tipus correcte (amb o sense error de BD)
        return await supplierService.getPaginatedSuppliers(supabase, activeTeamId, params);
    } catch (error: unknown) {
        // Captura d'errors de xarxa o altres errors inesperats
        const message = (error as Error).message;
        console.error("Unhandled error in fetchPaginatedSuppliers action:", message);
        return { data: [], count: 0 };
    }
}

/**
 * ACCIÓ: Esborra un proveïdor.
 */
export async function deleteSupplierAction(supplierId: string): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    const result = await supplierService.deleteSupplier(supabase, activeTeamId, supplierId);

    if (result.success) {
        revalidatePath('/finances/suppliers');
    }
    return result;
}

/**
 * ACCIÓ: Obté el detall d'un únic proveïdor.
 */
export async function fetchSupplierDetail(id: string): Promise<Supplier> {
    const session = await validateUserSession();
    if ("error" in session) {
        console.error("Session error fetching supplier detail:", session.error);
        throw new Error(session.error.message);
    }
    const { supabase, activeTeamId } = session;

    return await supplierService.fetchSupplierDetail(supabase, activeTeamId, id);
}

/**
 * ACCIÓ: Desa (crea o actualitza) un proveïdor.
 */
export async function saveSupplierAction(
    formData: SupplierFormData,
    supplierId: string | null
): Promise<ActionResult<Supplier>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    const result = await supplierService.saveSupplier(
        supabase, 
        user.id, 
        activeTeamId, 
        formData, 
        supplierId
    );
    
    if (result.success) {
        revalidatePath('/finances/suppliers');
        if (supplierId && supplierId !== 'new') {
            revalidatePath(`/finances/suppliers/${supplierId}`);
        }
    }
    
    return result;
}

/**
 * ACCIÓ: Obté la llista completa de proveïdors (per a selectors, etc.).
 */
export async function fetchSuppliers(): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    const session = await validateUserSession();
    if ("error" in session) return [];
    const { supabase, activeTeamId } = session;
    
    return await supplierService.fetchSuppliers(supabase, activeTeamId);
}

/**
 * ACCIÓ: Cerca proveïdors per nom per al combobox asíncron.
 */
export async function searchSuppliers(searchTerm: string): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    const session = await validateUserSession();
    if ("error" in session) return [];
    const { supabase, activeTeamId } = session;

    return await supplierService.searchSuppliers(supabase, activeTeamId, searchTerm);
}