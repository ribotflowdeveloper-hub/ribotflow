"use server";

import { revalidatePath } from "next/cache";
import type { Contact } from '@/types/crm/contacts'; // Assegurem que s'importa el tipus Contact correctament
import { validateUserSession } from "@/lib/supabase/session"; 

// ----------------------------------------------------
// ACCIONS DE LLISTA/FETCHING
// ----------------------------------------------------

/**
 * Obté tots els contactes/proveïdors de l'equip actiu.
 * Aquesta funció és cridada per Server Components com ExpenseDetailData.tsx.
 * * * ✅ El Per Què: Optimitza la càrrega de llistes per a selectors (dropdowns).
 */
export async function fetchContacts(): Promise<Contact[]> {
    const session = await validateUserSession();
    
    // Si la sessió falla (usuari no logat o sense equip), no podem fer el fetch.
    if ('error' in session) {
        // En lloc de llençar un error, que podria trencar la pàgina de detall,
        // retornem un array buit si la llista de contactes no és essencial per a l'autenticació.
        // Tot i així, en una aplicació on la despesa depèn de l'usuari, el redirect ja s'hauria fet.
        console.error("No es pot carregar la sessió per obtenir els contactes:", session.error.message);
        return [];
    }

    const { supabase } = session;
    
    // La clau és utilitzar un SELECT lleuger. 
    // La RLS filtrarà automàticament per team_id.
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            id,
            nom,
            nif,
            email,
            telefon,
            estat,
            empresa,
            valor
        `)
        .order('nom', { ascending: true }); // Ordenació alfabètica per defecte

    if (error) {
        console.error("Error en carregar els contactes:", error);
        // Llançar un error actiu per al error.tsx (gestió d'errors al servidor)
        throw new Error("No s'han pogut carregar els contactes.");
    }
    
    // ✅ Bona Pràctica: Casting segur al tipus definit (Contact[])
    return (data as Contact[]) || []; 
}


// ----------------------------------------------------
// ACCIONS DE MUTACIÓ
// ----------------------------------------------------

export async function createContactAction(
    formData: FormData
): Promise<{ data: Contact | null; error: { message: string } | null }> {

    // ✅ 2. Cridem la funció de validació.
    const session = await validateUserSession();
    if ('error' in session) {
        return { data: null, error: session.error };
    }
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
        team_id: activeTeamId, 
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

