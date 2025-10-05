// a l'arxiu d'accions dels contactes

"use server";

import { revalidatePath } from "next/cache";
import type { Contact } from '@/types/crm';
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la nova funció

export async function createContactAction(
    formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {

    // ✅ 2. Cridem la funció de validació. Tot en una línia.
    const session = await validateUserSession();
    if ('error' in session) {
        return { data: null, error: session.error };
    }
    // A partir d'aquí, sabem que tenim tot el que necessitem.
    const { supabase, user, activeTeamId } = session;

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