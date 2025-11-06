"use server";

import { revalidatePath } from "next/cache";
// ✅ 1. Importem guardians, permisos i límits
import { 
  validateSessionAndPermission,
  validateActionAndUsage
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import { type ActionResult } from "@/types/shared/actionResult";
import { type PaginatedActionParams } from '@/hooks/usePaginateResource';

import * as supplierService from '@/lib/services/finances/suppliers/suppliers.service';
import type { 
  Supplier, 
  SupplierFormData,
  SupplierPageFilters,
  PaginatedSuppliersData
} from '@/lib/services/finances/suppliers/suppliers.service';

// --- Acció per Obtenir Dades Paginades ---
export async function fetchPaginatedSuppliers(
    params: PaginatedActionParams<SupplierPageFilters>
): Promise<PaginatedSuppliersData> {
    // ✅ 2. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ("error" in session) {
        console.error("Session error fetching suppliers:", session.error);
        return { data: [], count: 0 };
    }
    const { supabase, activeTeamId } = session;

    try {
        return await supplierService.getPaginatedSuppliers(supabase, activeTeamId, params);
    } catch (error: unknown) {
        const message = (error as Error).message;
        console.error("Unhandled error in fetchPaginatedSuppliers action:", message);
        return { data: [], count: 0 };
    }
}

/**
 * ACCIÓ: Esborra un proveïdor.
 */
export async function deleteSupplierAction(supplierId: string): Promise<ActionResult> {
    // ✅ 3. Validació de GESTIÓ
    const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_SUPPLIERS);
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
    // ✅ 4. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
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
    
    // ✅ 5. CAPA 3: Validació de GESTIÓ + LÍMIT
    let validationResult;
    const isNew = supplierId === null || supplierId === 'new';
    const limitToCheck: PlanLimit = 'maxSuppliers'; // Definim el límit

    if (isNew) {
        // Si és nou, comprovem permís I límit
        validationResult = await validateActionAndUsage(
            PERMISSIONS.MANAGE_SUPPLIERS,
            limitToCheck
        );
    } else {
        // Si edita, només comprovem permís
        validationResult = await validateSessionAndPermission(
            PERMISSIONS.MANAGE_SUPPLIERS
        );
    }

    if ("error" in validationResult) {
        return { success: false, message: validationResult.error.message };
    }

    const { supabase, user, activeTeamId } = validationResult;

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
    // ✅ 6. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ("error" in session) return [];
    const { supabase, activeTeamId } = session;
    
    return await supplierService.fetchSuppliers(supabase, activeTeamId);
}

/**
 * ACCIÓ: Cerca proveïdors per nom per al combobox asíncron.
 */
export async function searchSuppliers(searchTerm: string): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    // ✅ 7. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ("error" in session) return [];
    const { supabase, activeTeamId } = session;

    return await supplierService.searchSuppliers(supabase, activeTeamId, searchTerm);
}