"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type Contact } from '../page';

// Server Action per actualitzar un contacte
export async function updateContactAction(
  contactId: string,
  formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Usuari no autenticat." } };
  }

  // Creem un objecte amb totes les dades del formulari
  const hobbiesValue = formData.get('hobbies') as string;
  const dataToUpdate = {
    nom: formData.get('nom') as string,
    empresa: formData.get('empresa') as string,
    email: formData.get('email') as string,
    telefon: formData.get('telefon') as string,
    estat: formData.get('estat') as string,
    job_title: formData.get('job_title') as string,
    industry: formData.get('industry') as string,
    lead_source: formData.get('lead_source') as string,
    birthday: formData.get('birthday') || null,
    notes: formData.get('notes') as string,
    children_count: formData.get('children_count') ? parseInt(formData.get('children_count') as string, 10) : null,
    partner_name: formData.get('partner_name') as string,
    hobbies: hobbiesValue ? hobbiesValue.split(',').map(item => item.trim()) : [],
    address: {
        city: formData.get('address.city') as string,
    },
    social_media: {
        linkedin: formData.get('social_media.linkedin') as string,
    }
  };

  const { data, error } = await supabase
    .from('contacts')
    .update(dataToUpdate)
    .eq('id', contactId)
    .select()
    .single();

  if (error) {
    console.error("Error en actualitzar el contacte:", error);
    return { data: null, error: { message: error.message } };
  }

  revalidatePath(`/crm/contactes/${contactId}`);
  return { data, error: null };
}