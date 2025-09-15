// La directiva "use server" indica a Next.js que aquest arxiu conté "Server Actions".
// Aquestes funcions s'executen de forma segura al servidor, però es poden cridar
// directament des de components de client com si fossin funcions locals.
"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
// 'revalidatePath' és una funció clau de Next.js. Després d'una mutació a la base de dades,
// li diem a Next.js que invalidi la memòria cau d'una ruta específica. La pròxima vegada
// que un usuari visiti aquesta ruta, Next.js tornarà a carregar les dades des del servidor.
import { revalidatePath } from "next/cache";
import type { Contact } from '@/types/crm';

/**
 * Server Action per crear un nou contacte a la base de dades.
 * @param formData Dades del formulari enviades des del client.
 * @returns Un objecte amb les dades del nou contacte o un missatge d'error.
 */
export async function createContactAction(
  formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Comprovació de seguretat fonamental: assegurem que hi ha un usuari autenticat.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Usuari no autenticat." } };
  }

  // Extracció i validació bàsica de les dades del formulari.
  const nom = formData.get('nom') as string;
  const email = formData.get('email') as string;

  if (!nom || !email) {
    return { data: null, error: { message: 'El nom i l\'email són obligatoris.' } };
  }

  // Construïm l'objecte que s'inserirà a la base de dades.
  const dataToInsert = {
    nom,
    email,
    empresa: formData.get('empresa') as string,
    telefon: formData.get('telefon') as string,
    estat: formData.get('estat') as 'Lead' | 'Actiu' | 'Client',
    valor: parseFloat(formData.get('valor') as string) || 0,
    user_id: user.id, // Assignem el contacte a l'usuari actual.
  };

  // Executem la inserció a la taula 'contacts'.
  const { data, error } = await supabase
    .from('contacts')
    .insert(dataToInsert)
    .select() // Demanem que ens retorni el registre acabat de crear.
    .single(); // Esperem un únic resultat.

  if (error) {
    console.error("Error en crear el contacte:", error);
    return { data: null, error: { message: error.message } };
  }

  // Si tot ha anat bé, revalidem la pàgina de contactes per mostrar el nou registre.
  revalidatePath('/crm/contactes');
  return { data, error: null };
}