"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Contact } from '@/types/crm';
import { cookies } from "next/headers";

export async function createContactAction(
  formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {

  const supabase = createClient(cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Usuari no autenticat." } };
  }

  // --- AQUESTA ÉS LA PART NOVA I MÉS IMPORTANT ---
  // 1. Busquem a quin equip pertany l'usuari que fa l'acció.
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single();

  // Si no trobem l'equip, no podem continuar.
  if (memberError || !member) {
    console.error("Error en obtenir l'equip de l'usuari:", memberError);
    return { data: null, error: { message: "No s'ha pogut determinar l'equip de l'usuari." } };
  }
  const teamId = member.team_id;
  // ---------------------------------------------------

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
    team_id: teamId, // ✅ Ara la variable teamId sí que existeix
    user_id: user.id, // Pots mantenir-ho per saber qui el va crear
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
