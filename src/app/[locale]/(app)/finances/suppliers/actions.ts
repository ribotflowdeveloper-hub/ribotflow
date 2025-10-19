"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { validateUserSession } from "@/lib/supabase/session";
import { type Supplier } from "@/types/finances/suppliers";
import { type Database } from "@/types/supabase";
import { type ActionResult } from "@/types/shared/index";

// --- Tipus Específics ---
type SupplierRow = Database['public']['Tables']['suppliers']['Row'];
export type SupplierFormData = Omit<SupplierRow, 'id' | 'created_at' | 'user_id' | 'team_id'>;

export interface PaginatedSuppliersResponse {
    data: Supplier[];
    count: number;
}


// ✅ Tornem a necessitar aquest tipus com a argument
export interface SupplierFilters {
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
// --- Funcions Públiques (Server Actions) ---

/**
 * Obté la llista paginada de proveïdors.
 * ✅ REVERTIT: Ara accepta l'objecte 'filters' un altre cop.
 */
export async function fetchPaginatedSuppliers(
    filters: SupplierFilters // <-- Accepta 'filters'
): Promise<PaginatedSuppliersResponse> {
    const session = await validateUserSession();
    if ("error" in session) { /* ... gestió error ... */ return { data: [], count: 0 }; }
    const { supabase, activeTeamId } = session;

    // ✅ Llegim els valors des de l'objecte 'filters'
    const {
        searchTerm,
        sortBy = 'nom',
        sortOrder = 'asc',
        limit = 10, // Pren valor per defecte si no ve a filters
        offset = 0  // Pren valor per defecte si no ve a filters
    } = filters;

    console.log('fetchPaginatedSuppliers - Received Filters:', filters);

    // --- Consulta de Dades (la lògica aquí es queda igual) ---
    let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .eq('team_id', activeTeamId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1); // offset + limit - 1 és correcte

    if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) { /* ... gestió error ... */ return { data: [], count: 0 }; }

    return {
        data: data || [],
        count: count ?? 0
    };
}
// ... (fetchSupplierDetail, saveSupplierAction, deleteSupplierAction, fetchSuppliers, searchSuppliers es queden igual) ...

/**
 * Obté el detall d'un únic proveïdor.
 */
export async function fetchSupplierDetail(id: string): Promise<Supplier | null> {
    const session = await validateUserSession();
    if ("error" in session) return null;
    const { supabase, activeTeamId } = session;

    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .eq('team_id', activeTeamId)
        .single();

    if (error) {
        console.error("Error fetching supplier detail:", error.message);
        return null;
    }
    return data;
}

/**
 * Desa (crea o actualitza) un proveïdor.
 */
export async function saveSupplierAction(
    formData: SupplierFormData,
    supplierId: string | null
): Promise<ActionResult<Supplier>> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;
    const isNew = supplierId === null || supplierId === 'new';

    try {
        if (isNew) {
            const { data, error } = await supabase.from('suppliers').insert({ ...formData, user_id: user.id, team_id: activeTeamId }).select().single();
            if (error) throw error;
            revalidatePath('/finances/suppliers');
            return { success: true, message: "Proveïdor creat amb èxit.", data: data as Supplier };
        } else {
            const { data, error } = await supabase.from('suppliers').update(formData).eq('id', supplierId).eq('team_id', activeTeamId).select().single();
            if (error) throw error;
            revalidatePath('/finances/suppliers');
            revalidatePath(`/finances/suppliers/${supplierId}`);
            return { success: true, message: "Proveïdor actualitzat amb èxit.", data: data as Supplier };
        }
    } catch (e) {
        const error = e as Error;
        console.error("Unexpected error saving supplier:", error);
        return { success: false, message: `Un error inesperat ha ocorregut: ${error.message}` };
    }
}

/**
 * Esborra un proveïdor.
 */
export async function deleteSupplierAction(supplierId: string): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;
    const { error } = await supabase.from('suppliers').delete().eq('id', supplierId).eq('team_id', activeTeamId);
    if (error) {
        console.error("Error deleting supplier:", error);
        return { success: false, message: `Error esborrant proveïdor: ${error.message}` };
    }
    revalidatePath('/finances/suppliers');
    return { success: true, message: "Proveïdor esborrat amb èxit." };
}

/**
 * Obté la llista completa de proveïdors (per a selectors, etc.).
 */
export async function fetchSuppliers(): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    const supabase = createServerActionClient();
    const { data, error } = await supabase.from('suppliers').select('id, nom').order('nom', { ascending: true });
    if (error) throw new Error("No s'han pogut carregar els proveïdors.");
    return data || [];
}

/**
 * Cerca proveïdors per nom per al combobox asíncron.
 */
export async function searchSuppliers(searchTerm: string): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    const supabase = createServerActionClient();
    let query = supabase.from('suppliers').select('id, nom').order('nom', { ascending: true }).limit(20);
    if (searchTerm) query = query.ilike('nom', `%${searchTerm}%`);
    const { data, error } = await query;
    if (error) { console.error("Error en cercar proveïdors:", error.message); return []; }
    return data || [];
}