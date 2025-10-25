"use server";

import { revalidatePath } from "next/cache";

import { validateUserSession } from "@/lib/supabase/session";

import { notFound } from 'next/navigation';
// ✅ Importem l'schema i FormState des de l'arxiu general d'accions
// ✅ Importem des del nou fitxer schemas.ts a la carpeta pare
import { productSchema, type FormState, type Product } from "../schemas";
// --- Accions per a la Pàgina de Detall del Producte ---

/**
 * Obté les dades d'un producte específic per ID.
 * Llança un error 404 si no es troba o no hi ha permisos.
 */
export async function fetchProductDetail(productId: number): Promise<Product> {
    const session = await validateUserSession();
    if ('error' in session) { throw new Error(session.error.message); }
    const { supabase, activeTeamId } = session;

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('team_id', activeTeamId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching product detail:", error);
        throw new Error("No s'ha pogut carregar el producte.");
    }
    if (!product) {
        notFound();
    }
    return product;
}

/**
 * Actualitza un producte existent (utilitzat pel formulari a la pàgina de detall).
 */
export async function updateProduct(
  id: number, // L'ID es passa com a primer argument (bind)
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get('is_active') === 'on',
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Errors de validació.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // Excloem camps que no s'haurien d'actualitzar directament si cal
    // const { id: _id, created_at: _created, user_id: _user, team_id: _team, ...updateData } = validatedFields.data;
    // .update(updateData) // Si vols ser més estricte

    const { data: updatedProduct, error } = await supabase
        .from('products')
        .update(validatedFields.data) // Actualitzem amb les dades validades
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error("Error updating product:", error); // Log l'error
        return {
            success: false,
            message: `Error en actualitzar el producte: ${error.message}`,
        };
    }

    // Revalidem la llista i la pàgina de detall
    revalidatePath('/crm/products');
    revalidatePath(`/crm/products/${id}`);
    return {
        success: true,
        message: 'Producte actualitzat correctament.',
        data: updatedProduct,
    };
}

// ❗ L'acció deleteProduct es manté a ../actions.ts perquè la necessita GenericDataTable