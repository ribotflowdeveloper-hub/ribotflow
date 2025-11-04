// /app/[locale]/(app)/finances/suppliers/[supplierId]/actions.ts (FITXER NOU)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type ActionResult } from "@/types/shared/actionResult";

// ✅ 1. Importem el servei consolidat
import * as supplierService from '@/lib/services/finances/suppliers/suppliers.service';

// ✅ 2. Importem tipus per a ús intern
import type { 
  Supplier, 
  SupplierFormData
} from '@/lib/services/finances/suppliers/suppliers.service';

/**
 * ACCIÓ: Obté el detall d'un únic proveïdor.
 */
export async function fetchSupplierDetail(id: string): Promise<Supplier> {
    const session = await validateUserSession();
    if ("error" in session) {
        console.error("Session error fetching supplier detail:", session.error);
        throw new Error(session.error.message); // Llança error que 'ProductDetailData' capturarà
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
    
    // Gestionem la revalidació
    if (result.success) {
        revalidatePath('/finances/suppliers');
        // Revalidem la pàgina de detall només si estàvem editant
        if (supplierId && supplierId !== 'new') {
            revalidatePath(`/finances/suppliers/${supplierId}`);
        }
    }
    
    return result;
}