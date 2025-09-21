// La directiva "use server" indica a Next.js que aquest arxiu conté "Server Actions".
// Aquestes funcions s'executaran de forma segura NOMÉS al servidor.
"use server";

import { createClient } from "@/lib/supabase/server";
// 'revalidatePath' és una funció clau de Next.js per invalidar la memòria cau d'una pàgina.
import { revalidatePath } from "next/cache";
// 'zod' és una llibreria per a la validació d'esquemes. Assegura que les dades
// que rebem del client tenen el format i els tipus correctes abans de processar-les.
import { z } from "zod";
import { cookies } from "next/headers";

/**
 * Defineix l'esquema de dades per a un producte utilitzant Zod.
 * Aquestes són les "regles" que han de complir les dades del formulari.
 * 'coerce' intenta convertir el valor rebut (ex: un text) al tipus esperat (ex: un número).
 * 'optional()' i 'nullable()' permeten que el camp pugui ser opcional o nul.
 */
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

/**
 * Tipus de dades per a l'objecte d'estat que retornen les nostres accions.
 * Permet al component de client saber si l'acció ha tingut èxit, mostrar un missatge
 * i, si cal, mostrar errors de validació específics per a cada camp.
 */
export type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

/**
 * Server Action per CREAR un nou producte.
 * @param prevState L'estat anterior del formulari (requerit per 'useActionState').
 * @param formData Les dades enviades pel formulari del client.
 */
export async function createProduct(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    // Validem les dades rebudes del formulari contra el nostre esquema 'productSchema'.
    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        // El valor d'un checkbox marcat arriba com 'on'. El convertim a un booleà.
        is_active: formData.get("is_active") === 'on',
    });

    // Si la validació falla, retornem els errors al client.
    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }

    // Si la validació té èxit, inserim les dades a la base de dades.
    const { error } = await supabase.from("products").insert({ ...validatedFields.data, user_id: user.id });

    if (error) return { success: false, message: "Error en crear el producte: " + error.message };

    // Invalidem la memòria cau de la pàgina de productes. Això farà que la llista es refresqui
    // automàticament al client amb el nou producte afegit.
    revalidatePath("/crm/products");
    return { success: true, message: "Producte creat correctament." };
}
  
/**
 * Server Action per ACTUALITZAR un producte existent.
 * @param id L'ID del producte a actualitzar (passat via 'bind' des del client).
 * @param prevState L'estat anterior del formulari.
 * @param formData Les dades enviades pel formulari del client.
 */
export async function updateProduct(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    // La lògica de validació és idèntica a la de 'createProduct'.
    const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        is_active: formData.get("is_active") === 'on',
    });

    if (!validatedFields.success) {
        return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    // Si la validació té èxit, actualitzem el registre a la base de dades.
    const { error } = await supabase.from("products").update(validatedFields.data).eq("id", id).eq("user_id", user.id);

    if (error) return { success: false, message: "Error en actualitzar el producte: " + error.message };
    
    revalidatePath("/crm/products");
    return { success: true, message: "Producte actualitzat correctament." };
}

/**
 * Server Action per ELIMINAR un producte.
 * @param id L'ID del producte a eliminar.
 */
export async function deleteProduct(id: string) {
    const cookieStore = cookies();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    // Executem l'operació d'eliminació a la base de dades.
    const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { success: false, message: "Error en eliminar el producte: " + error.message };

    revalidatePath("/crm/products");
    return { success: true, message: "Producte eliminat correctament." };
}