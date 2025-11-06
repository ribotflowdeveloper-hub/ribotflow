"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult } from "@/types/shared/actionResult";

// ✅ 1. Importem guardians, permisos i límits
import { 
  validateSessionAndPermission,
  validateActionAndUsage
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import * as supplierService from '@/lib/services/finances/suppliers/suppliers.service';
import type { 
  Supplier, 
  SupplierFormData
} from '@/lib/services/finances/suppliers/suppliers.service';

/**
 * ACCIÓ: Obté el detall d'un únic proveïdor.
 */
export async function fetchSupplierDetail(id: string): Promise<Supplier> {
    // ✅ 2. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ("error" in session) {
        console.error("Session error fetching supplier detail:", session.error);
        throw new Error(session.error.message); 
    }
    const { supabase, activeTeamId } = session;

    // El servei ja gestiona el notFound()
    return await supplierService.fetchSupplierDetail(supabase, activeTeamId, id);
}

/**
 * ACCIÓ: Desa (crea o actualitza) un proveïdor.
 */
export async function saveSupplierAction(
    formData: SupplierFormData,
    supplierId: string | null
): Promise<ActionResult<Supplier>> {
    
    // ✅ 3. CAPA 3: Validació de GESTIÓ + LÍMIT
    let validationResult;
    const isNew = supplierId === null || supplierId === 'new';
    const limitToCheck: PlanLimit = 'maxSuppliers'; // Definim el límit

    if (isNew) {
        validationResult = await validateActionAndUsage(
            PERMISSIONS.MANAGE_SUPPLIERS,
            limitToCheck
        );
    } else {
        validationResult = await validateSessionAndPermission(
            PERMISSIONS.MANAGE_SUPPLIERS
        );
    }

    if ("error" in validationResult) {
        return { success: false, message: validationResult.error.message };
    }

    // Validació superada
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