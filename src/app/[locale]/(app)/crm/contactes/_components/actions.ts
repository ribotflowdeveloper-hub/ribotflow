// a l'arxiu d'accions dels contactes

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

    // --- AQUESTA ÉS LA NOVA LÒGICA CORRECTA ---
    // A les accions, és més segur llegir l'ID directament de l'objecte user,
    // ja que aquest ve validat per les cookies de la pròpia acció.
    const activeTeamId = user.app_metadata?.active_team_id;

    if (!activeTeamId) {
        return { data: null, error: { message: "No s'ha pogut determinar l'equip actiu." } };
    }
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
        team_id: activeTeamId, // ✅ Inserim l'ID de l'equip actiu
        user_id: user.id,
    };

    // La política RLS 'WITH CHECK' de la taula 'contacts' verificarà que
    // l'usuari té permís per inserir en aquest 'team_id'.
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