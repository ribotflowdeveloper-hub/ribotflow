"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció
import type { Product } from '@/types/crm/products'; // ✅ Importa el tipus

// Esquema de Zod per a validar les dades del formulari.
const productSchema = z.object({
    name: z.string().min(3, "El nom ha de tenir almenys 3 caràcters."),
    price: z.coerce.number().positive("El preu ha de ser un número positiu."),
    iva: z.coerce.number().min(0).optional().nullable(),
    discount: z.coerce.number().min(0).max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
});

// ✅ Modifiquem el tipus de retorn per incloure les dades del producte
export type FormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string[] | undefined>;
    data?: Product | null; // ✅ AFEGEIX AIXÒ
};

/**
 * Crea un nou producte.
 */
export async function createProduct(prevState: FormState, formData: FormData): Promise<FormState> {
    // ✅ 2. Validació centralitzada
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get("is_active") === 'on',
    });

    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }

     // ✅ Modifiquem la inserció per obtenir el producte creat
     const { data: newProduct, error } = await supabase.from("products").insert({ 
        ...validatedFields.data, 
        user_id: user.id, 
        team_id: activeTeamId 
    }).select().single(); // ✅ AFEGEIX .select().single()

    if (error) {
        return { success: false, message: `Error en crear el producte: ${error.message}` };
    }

    revalidatePath("/crm/products");
    return { success: true, message: "Producte creat correctament.", data: newProduct };
}
 
/**
 * Actualitza un producte existent.
 */
export async function updateProduct(id: number, prevState: FormState, formData: FormData): Promise<FormState> {
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get("is_active") === 'on',
    });

    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    // ✅ Modifiquem l'actualització per obtenir el producte actualitzat
    const { data: updatedProduct, error } = await supabase
        .from("products")
        .update(validatedFields.data)
        .eq("id", id)
        .select() // ✅ AFEGEIX .select()
        .single(); // ✅ AFEGEIX .single()

    if (error) {
        return { success: false, message: `Error en actualitzar el producte: ${error.message}` };
    }
    
    revalidatePath("/crm/products");
    revalidatePath(`/crm/products/${id}`);
    // ✅ Retornem el producte actualitzat a la propietat 'data'
    return { success: true, message: "Producte actualitzat correctament.", data: updatedProduct };
}

/**
 * Elimina un producte.
 */
export async function deleteProduct(id: number): Promise<FormState> {
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
        return { success: false, message: `Error en eliminar el producte: ${error.message}` };
    }

    revalidatePath("/crm/products");
    return { success: true, message: "Producte eliminat correctament." };
}