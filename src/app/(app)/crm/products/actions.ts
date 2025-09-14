"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers"; // ✅ 1. Importa 'cookies'

// Esquema de validació amb Zod per assegurar la qualitat de les dades
// ✅ Esquema actualitzat amb els nous camps opcionals
const productSchema = z.object({
    name: z.string().min(3, "El nom ha de tenir almenys 3 caràcters."),
    price: z.coerce.number().positive("El preu ha de ser un número positiu."),
    iva: z.coerce.number().min(0).optional().nullable(),
    discount: z.coerce.number().min(0).max(100).optional().nullable(),
    // ✅ NOUS CAMPS AFEGITS A LA VALIDACIÓ
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
  });

// Tipus per a l'estat del formulari
export type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

// ✅ Acció de CREAR actualitzada
export async function createProduct(prevState: FormState, formData: FormData): Promise<FormState> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };
  
    const validatedFields = productSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      price: formData.get("price"),
      iva: formData.get("iva"),
      discount: formData.get("discount"),
      is_active: formData.get("is_active") === 'on', // ✅ Gestió del checkbox/switch
    });
  
    if (!validatedFields.success) {
      return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
    }
  
    const { name, price, iva, discount, description, category, unit, is_active } = validatedFields.data;
    const { error } = await supabase.from("products").insert({ name, price, iva, discount, description, category, unit, is_active, user_id: user.id });
  
    if (error) return { success: false, message: "Error en crear el producte: " + error.message };
  
    revalidatePath("/crm/products");
    return { success: true, message: "Producte creat correctament." };
  }
  
  // ✅ Acció d'ACTUALITZAR actualitzada
  export async function updateProduct(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: "No autoritzat" };
  
      const validatedFields = productSchema.safeParse({
        ...Object.fromEntries(formData.entries()),
        price: formData.get("price"),
        iva: formData.get("iva"),
        discount: formData.get("discount"),
        is_active: formData.get("is_active") === 'on', // ✅ Gestió del checkbox/switch
      });
  
      if (!validatedFields.success) {
          return { success: false, message: "Errors de validació.", errors: validatedFields.error.flatten().fieldErrors };
      }
      
      const { name, price, iva, discount, description, category, unit, is_active } = validatedFields.data;
        const { error } = await supabase.from("products").update({ name, price, iva, discount, description, category, unit, is_active }).eq("id", id).eq("user_id", user.id);
  
      if (error) return { success: false, message: "Error en actualitzar el producte: " + error.message };
      
      revalidatePath("/crm/products");
      return { success: true, message: "Producte actualitzat correctament." };
  }

// Acció per ELIMINAR un producte
export async function deleteProduct(id: string) {
    const cookieStore = cookies(); // ✅ 2. Llegeix les cookies
    const supabase = createClient(cookieStore); // ✅ 3. Passa-les al client
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autoritzat" };

    const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { success: false, message: "Error en eliminar el producte: " + error.message };

    revalidatePath("/crm/products");
    return { success: true, message: "Producte eliminat correctament." };
}