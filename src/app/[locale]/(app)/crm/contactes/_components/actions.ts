"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Contact } from '@/types/crm';
import { cookies } from "next/headers";

export async function createContactAction(
  formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {
  
  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Usuari no autenticat." } };
  }

  const nom = formData.get('nom') as string;
  const email = formData.get('email') as string;

  if (!nom || !email) {
    return { data: null, error: { message: 'El nom i l\'email són obligatoris.' } };
  }

  const dataToInsert = {
    nom,
    email,
    empresa: formData.get('empresa') as string,
    telefon: formData.get('telefon') as string,
    estat: formData.get('estat') as 'Lead' | 'Proveidor' | 'Client',
    valor: parseFloat(formData.get('valor') as string) || 0,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('contacts')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error en crear el contacte:", error);
    return { data: null, error: { message: error.message } };
  }

  revalidatePath('/crm/contactes');
  return { data, error: null };
}