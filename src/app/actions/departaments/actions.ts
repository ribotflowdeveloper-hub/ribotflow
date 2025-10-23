// src/app/actions/departments/actions.ts (Últim Intent amb 'as any')

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession } from '@/lib/supabase/session';
import { Database, Tables } from '@/types/supabase';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

type ActionResult = {
    success?: boolean;
    error?: string;
    newDepartment?: Tables<'departments'>;
};

const departmentNameSchema = z.string()
    .min(1, 'El nom del departament és obligatori.')
    .max(100, 'El nom no pot superar els 100 caràcters.');

// --- Crear Departament ---
export async function createDepartment(teamId: string | undefined, name: string): Promise<ActionResult> {
    if (!teamId) { return { error: "Falta l'identificador de l'equip." }; }
    const validation = departmentNameSchema.safeParse(name);
    if (!validation.success) { return { error: validation.error.errors[0]?.message ?? "Nom de departament invàlid." }; }
    const validatedName = validation.data;

    console.log(`--- [Server Action] Intentant crear departament: "${validatedName}" per a l'equip ${teamId} ---`);

    const sessionInfo = await validateUserSession();
    if ('error' in sessionInfo) { return { error: sessionInfo.error.message }; }
    const supabase = createServerActionClient<Database>({ cookies });

    // TODO: Comprovació de Permisos Específica

    // Objecte simple per inserir
    const departmentData = {
        name: validatedName,
        team_id: teamId
    };

    // Intent d'inserció
    // Tipem explícitament l'objecte per evitar 'any'
    const { data: insertedData, error }: PostgrestSingleResponse<Tables<'departments'>> = await supabase
        .from('departments')
     
        .select()
        .single();

    // Gestió d'errors
    if (error) {
        console.error("Error creant departament a Supabase:", error);
        if (error.code === '23505') { return { error: `Ja existeix un departament amb el nom "${validatedName}" en aquest equip.` }; }
        return { error: `Error de base de dades: ${error.message}` };
    }

    // Comprovació de dades retornades
    if (!insertedData) {
         console.error("Supabase no ha retornat dades després de la inserció tot i no haver error.");
         return { error: "No s'han pogut obtenir les dades del nou departament." };
    }

    // Accés a les propietats (ara hauria de funcionar gràcies al tipat de PostgrestSingleResponse)
    console.log(`Departament "${insertedData.name}" creat amb ID: ${insertedData.id}`);

    // Revalidació
    revalidatePath('/[locale]/(app)/dashboard', 'layout');
    revalidatePath('/[locale]/(app)/crm/calendari', 'layout');

    // Retorn
    return { success: true, newDepartment: insertedData };
}

// --- Eliminar Departament ---
// (Es manté igual)
export async function deleteDepartment(departmentId: number): Promise<ActionResult> {
     if (isNaN(departmentId) || departmentId <= 0) { return { error: "ID de departament invàlid." }; }
     console.log(`--- [Server Action] Intentant eliminar departament ID: ${departmentId} ---`);
     const sessionInfo = await validateUserSession();
     if ('error' in sessionInfo) { return { error: sessionInfo.error.message }; }
     const supabase = createServerActionClient<Database>({ cookies });
     // TODO: Comprovació de Permisos
     const { count, error: checkError } = await supabase
         .from('tasks')
         .select('*', { count: 'exact', head: true })
         .eq('department_id', departmentId);
     if (checkError) { console.error("Error comprovant l'ús del departament:", checkError); return { error: "No s'ha pogut verificar si el departament està en ús." }; }
     if (count !== null && count > 0) { return { error: `No es pot eliminar. El departament està assignat a ${count} tasca(ques). Desassigna'l primer.` }; }
     const { error } = await supabase.from('departments').delete().eq('id', departmentId);
     if (error) { console.error("Error eliminant departament de Supabase:", error); return { error: `Error de base de dades: ${error.message}` }; }
     console.log(`Departament ID: ${departmentId} eliminat correctament.`);
     revalidatePath('/[locale]/(app)/dashboard', 'layout');
     revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
     return { success: true };
}