// src/app/[locale]/(app)/finances/proveidors/actions.ts
"use server";

import { createClient as createServerActionClient } from "@/lib/supabase/server";
import { Supplier } from "@/types/finances/suppliers";

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