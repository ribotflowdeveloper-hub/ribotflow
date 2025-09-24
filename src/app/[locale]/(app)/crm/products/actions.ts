"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers";

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

// Tipus per a l'estat del formulari, útil per a la gestió d'errors amb 'useFormState'.
export type FormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string[] | undefined>;
};

/**
 * Crea un nou producte associat a l'equip actiu de l'usuari.
 */
export async function createProduct(prevState: FormState, formData: FormData): Promise<FormState> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    // Obtenim l'equip actiu directament del token de l'usuari.
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { success: false, message: "No s'ha pogut trobar l'equip actiu." };
    }

    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get("is_active") === 'on',
    });

    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }

    // Inserim les dades, afegint user_id i l'activeTeamId.
    // La política RLS 'WITH CHECK' de la base de dades verificarà els permisos.
    const { error } = await supabase.from("products").insert({ 
        ...validatedFields.data, 
        user_id: user.id, 
        team_id: activeTeamId 
    });

    if (error) {
        return { success: false, message: `Error en crear el producte: ${error.message}` };
    }

    revalidatePath("/crm/products");
    return { success: true, message: "Producte creat correctament." };
}
 
/**
 * Actualitza un producte existent.
 */
export async function updateProduct(id: number, prevState: FormState, formData: FormData): Promise<FormState> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get("is_active") === 'on',
    });

    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    // La política RLS de la base de dades s'encarregarà de verificar
    // que només podem editar un producte del nostre equip actiu.
    const { error } = await supabase
        .from("products")
        .update(validatedFields.data)
        .eq("id", id);

    if (error) {
        return { success: false, message: `Error en actualitzar el producte: ${error.message}` };
    }
    
    revalidatePath("/crm/products");
    return { success: true, message: "Producte actualitzat correctament." };
}

/**
 * Elimina un producte.
 */
export async function deleteProduct(id: number): Promise<FormState> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    // La política RLS s'encarregarà de verificar que només podem eliminar
    // un producte del nostre equip actiu.
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
        return { success: false, message: `Error en eliminar el producte: ${error.message}` };
    }

    revalidatePath("/crm/products");
    return { success: true, message: "Producte eliminat correctament." };
}