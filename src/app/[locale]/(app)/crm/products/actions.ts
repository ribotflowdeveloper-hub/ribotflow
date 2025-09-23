"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers";

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

export type FormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string[] | undefined>;
};

// Funció auxiliar per obtenir el team_id de l'usuari de manera reutilitzable
import { SupabaseClient } from "@supabase/supabase-js";

async function getTeamId(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data: member } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single();
    return member?.team_id || null;
}

export async function createProduct(prevState: FormState, formData: FormData): Promise<FormState> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    const teamId = await getTeamId(supabase, user.id);
    if (!teamId) return { success: false, message: "No s'ha pogut trobar l'equip de l'usuari." };

    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get("is_active") === 'on',
    });

    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }

    // ✅ Afegim user_id i team_id a les dades a inserir
    const { error } = await supabase.from("products").insert({ 
        ...validatedFields.data, 
        user_id: user.id, 
        team_id: teamId 
    });

    if (error) return { success: false, message: "Error en crear el producte: " + error.message };

    revalidatePath("/crm/products");
    return { success: true, message: "Producte creat correctament." };
}
 
export async function updateProduct(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
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
    
    // ✅ Eliminem la comprovació de user_id. La seguretat la donarà la RLS.
    const { error } = await supabase.from("products").update(validatedFields.data).eq("id", id);

    if (error) return { success: false, message: "Error en actualitzar el producte: " + error.message };
    
    revalidatePath("/crm/products");
    return { success: true, message: "Producte actualitzat correctament." };
}

export async function deleteProduct(id: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    // ✅ Eliminem la comprovació de user_id. La seguretat la donarà la RLS.
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { success: false, message: "Error en eliminar el producte: " + error.message };

    revalidatePath("/crm/products");
    return { success: true, message: "Producte eliminat correctament." };
}
