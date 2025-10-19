"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { validateUserSession } from "@/lib/supabase/session";
import { type Supplier } from "@/types/finances/suppliers";

// ✅ 1. Importem 'Database' en lloc de 'Tables'. Aquesta és la convenció del teu projecte.
import { type Database } from "@/types/supabase";
import { type ActionResult } from "@/types/shared/index";

// --- Tipus Específics per a Proveïdors ---

// ✅ 2. Definim el tipus 'Row' a partir de 'Database'
type SupplierRow = Database['public']['Tables']['suppliers']['Row'];

// ✅ 3. Creem el tipus FormData a partir del 'Row'
export type SupplierFormData = Omit<SupplierRow, 'id' | 'created_at' | 'user_id' | 'team_id'>;

// Tipus per als filtres de la taula de llistat
export interface SupplierFilters {
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// Tipus de resposta per a la taula paginada
export interface PaginatedSuppliersResponse {
    data: Supplier[];
    count: number;
}

// --- Funcions Públiques (Server Actions) ---

/**
 * ✅ NOVA: Obté la llista paginada de proveïdors per a la taula principal.
 */
export async function fetchPaginatedSuppliers(filters: SupplierFilters): Promise<PaginatedSuppliersResponse> {
    const session = await validateUserSession();
    if ("error" in session) {
        console.error("Session error in fetchPaginatedSuppliers:", session.error);
        return { data: [], count: 0 };
    }
    const { supabase, activeTeamId } = session;

    const {
        searchTerm,
        sortBy = 'nom',
        sortOrder = 'asc',
        limit = 10,
        offset = 0
    } = filters;

    // --- 1. Consulta de Dades ---
    let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .eq('team_id', activeTeamId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

    if (searchTerm) {
        // Cerca en nom, nif o email
        query = query.or(`nom.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error("Error fetching paginated suppliers:", error.message);
        throw new Error("No s'han pogut carregar els proveïdors.");
    }

    return {
        data: data || [],
        count: count ?? 0
    };
}

/**
 * ✅ NOVA: Obté el detall d'un únic proveïdor.
 */
export async function fetchSupplierDetail(id: string): Promise<Supplier | null> {
    const session = await validateUserSession();
    if ("error" in session) return null;
    const { supabase, activeTeamId } = session;

    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .eq('team_id', activeTeamId) // Filtre de seguretat
        .single();

    if (error) {
        console.error("Error fetching supplier detail:", error.message);
        return null;
    }

    return data;
}

/**
 * ✅ NOVA: Desa (crea o actualitza) un proveïdor.
 */
export async function saveSupplierAction(
    formData: SupplierFormData,
    supplierId: string | null // 'new' o un UUID existent
): Promise<ActionResult<Supplier>> {
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    const isNew = supplierId === null || supplierId === 'new';

    try {
        if (isNew) {
            // --- Creació ---
            const { data, error } = await supabase
                .from('suppliers')
                .insert({
                    ...formData,
                    user_id: user.id,
                    team_id: activeTeamId
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating supplier:", error);
                return { success: false, message: `Error creant proveïdor: ${error.message}` };
            }
            
            revalidatePath('/finances/suppliers'); // Actualitza la llista
            return { success: true, message: "Proveïdor creat amb èxit.", data: data as Supplier };

        } else {
            // --- Actualització ---
            const { data, error } = await supabase
                .from('suppliers')
                .update(formData)
                .eq('id', supplierId)
                .eq('team_id', activeTeamId) // Filtre de seguretat
                .select()
                .single();

            if (error) {
                console.error("Error updating supplier:", error);
                return { success: false, message: `Error actualitzant proveïdor: ${error.message}` };
            }

            revalidatePath('/finances/suppliers'); // Actualitza la llista
            revalidatePath(`/finances/suppliers/${supplierId}`); // Actualitza el detall
            return { success: true, message: "Proveïdor actualitzat amb èxit.", data: data as Supplier };
        }
    } catch (e) {
        const error = e as Error;
        console.error("Unexpected error saving supplier:", error);
        return { success: false, message: `Un error inesperat ha ocorregut: ${error.message}` };
    }
}

/**
 * ✅ NOVA: Esborra un proveïdor.
 */
export async function deleteSupplierAction(supplierId: string): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    // Abans d'esborrar, la nostra migració (ON DELETE SET NULL)
    // s'encarregarà de desvincular els contactes automàticament.
    
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)
        .eq('team_id', activeTeamId); // Filtre de seguretat

    if (error) {
        console.error("Error deleting supplier:", error);
        return { success: false, message: `Error esborrant proveïdor: ${error.message}` };
    }

    revalidatePath('/finances/suppliers'); // Actualitza la llista
    return { success: true, message: "Proveïdor esborrat amb èxit." };
}


// --- Funcions de Suport (Comboboxes) ---
// Aquestes funcions ja les teníem i les mantenim.

/**
 * Obté la llista completa de proveïdors (per a selectors, etc.).
 * @returns Un array de proveïdors (només id i nom per eficiència).
 */
export async function fetchSuppliers(): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    const supabase = createServerActionClient();

    const { data, error } = await supabase
        .from('suppliers')
        .select('id, nom')
        .order('nom', { ascending: true });

    if (error) {
        console.error("Error en carregar els proveïdors:", error.message);
        throw new Error("No s'han pogut carregar els proveïdors.");
    }

    return data || [];
}

/**
 * Cerca proveïdors per nom per al combobox asíncron.
 * @param searchTerm El text a cercar en el nom del proveïdor.
 * @returns Un array de proveïdors (id i nom) que coincideixen, limitat a 20.
 */
export async function searchSuppliers(searchTerm: string): Promise<Pick<Supplier, 'id' | 'nom'>[]> {
    const supabase = createServerActionClient();

    let query = supabase
        .from('suppliers')
        .select('id, nom')
        .order('nom', { ascending: true })
        .limit(20);

    // Si hi ha un terme de cerca, l'apliquem
    if (searchTerm) {
        query = query.ilike('nom', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error en cercar proveïdors:", error.message);
        return [];
    }

    return data || [];
}