"use server";

import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { type Supplier } from "@/types/finances/suppliers";

/**
 * Obté la llista completa de proveïdors.
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
 * ✅ NOVA FUNCIÓ AFEGIDA
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
        // Retornem un array buit per no trencar el combobox en cas d'error
        return [];
    }

    return data || [];
}