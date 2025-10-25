// src/app/[locale]/(app)/finances/suppliers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type Supplier } from "@/types/finances/suppliers"; // Tipus Supplier
import { type Database } from "@/types/supabase";
import { type ActionResult } from "@/types/shared/actionResult"; // ActionResult
import {
  type PaginatedActionParams,
  type PaginatedResponse
} from '@/hooks/usePaginateResource'; // Tipus genèrics
import { createClient as createServerActionClient } from "@/lib/supabase/server"; // Client de servidor per a accions

// --- Tipus Específics ---
type SupplierRow = Database['public']['Tables']['suppliers']['Row'];
export type SupplierFormData = Omit<SupplierRow, 'id' | 'created_at' | 'user_id' | 'team_id'>;

// Filtres per a la pàgina de proveïdors (TFilters) - Buit per ara
export type SupplierPageFilters = object;

// Alias per al hook genèric
type FetchSuppliersParams = PaginatedActionParams<SupplierPageFilters>; // <-- Usa SupplierPageFilters
type PaginatedSuppliersData = PaginatedResponse<Supplier>; // <-- Usa Supplier

// --- Acció per Obtenir Dades Paginades (Refactoritzada) ---
export async function fetchPaginatedSuppliers(
    params: FetchSuppliersParams // <-- Accepta paràmetres genèrics
): Promise<PaginatedSuppliersData> { // <-- Retorna tipus genèric

    const { searchTerm, sortBy, sortOrder, limit, offset } = params; // Desestructurem

    const session = await validateUserSession();
    if ("error" in session) {
        console.error("Session error fetching suppliers:", session.error);
        return { data: [], count: 0 };
    }
    const { supabase, activeTeamId } = session;

    // Construcció de la consulta (similar a l'anterior)
    let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .eq('team_id', activeTeamId)
        .order(sortBy || 'nom', { ascending: sortOrder === 'asc' }) // Ordenació per defecte
        .range(offset, offset + limit - 1);

    if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error("Error fetching paginated suppliers:", error);
        return { data: [], count: 0 };
    }

    return {
        data: data || [],
        count: count ?? 0
    };
}

/**
 * Esborra un proveïdor.
 * ✅ Adaptat per retornar ActionResult.
 */
export async function deleteSupplierAction(supplierId: string): Promise<ActionResult> { // <-- Retorna ActionResult
    const session = await validateUserSession();
    if ("error" in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    // Comprovem si hi ha despeses associades PRIMER
    const { count: expenseCount, error: expenseError } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplierId)
        .eq('team_id', activeTeamId);

     if (expenseError) {
        console.error("Error checking related expenses:", expenseError);
        return { success: false, message: "Error en comprovar despeses relacionades." };
    }

    if (expenseCount && expenseCount > 0) {
        return { success: false, message: `No es pot eliminar. Hi ha ${expenseCount} despesa(es) associada(es) a aquest proveïdor.` };
    }

    // Si no hi ha despeses, procedim a eliminar
    const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)
        .eq('team_id', activeTeamId);

    if (deleteError) {
        console.error("Error deleting supplier:", deleteError);
        return { success: false, message: `Error esborrant proveïdor: ${deleteError.message}` };
    }

    revalidatePath('/finances/suppliers');
    return { success: true, message: "Proveïdor esborrat amb èxit." }; // <-- Retorn adaptat
}

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