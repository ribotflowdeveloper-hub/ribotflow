// src/app/actions/departments/actions.ts (Últim Intent amb 'as any')

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession } from '@/lib/supabase/session';
import { Database, Tables } from '@/types/supabase';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { getTranslations } from 'next-intl/server';

type ActionResult = {
    success?: boolean;
    error?: string;
    newDepartment?: Tables<'departments'>;
};

// --- Crear Departament ---
export async function createDepartment(teamId: string | undefined, name: string): Promise<ActionResult> {
    const t = await getTranslations('DepartmentActions');

    const departmentNameSchema = z.string()
        .min(1, t('nameRequired'))
        .max(100, t('nameTooLong'));
    
    if (!teamId) { return { error: t('missingTeamId') }; }
    const validation = departmentNameSchema.safeParse(name);
    if (!validation.success) { return { error: validation.error.issues[0]?.message ?? t('invalidName') }; }
    const validatedName = validation.data;

    console.log(`--- [Server Action] Intentant crear departament: "${validatedName}" per a l'equip ${teamId} ---`);

    const sessionInfo = await validateUserSession();
    if ('error' in sessionInfo) { return { error: sessionInfo.error.message }; }
    const supabase = createServerActionClient<Database>({ cookies });




    // Intent d'inserció
    // Tipem explícitament l'objecte per evitar 'any'
    const { data: insertedData, error }: PostgrestSingleResponse<Tables<'departments'>> = await supabase
        .from('departments')
     
        .select()
        .single();

    // Gestió d'errors
    if (error) {
        console.error("Error creant departament a Supabase:", error);
        if (error.code === '23505') { return { error: t('duplicateName', { name: validatedName }) }; }
return { error: t('dbError', { message: error.message }) };
    }

    // Comprovació de dades retornades
    if (!insertedData) {
         console.error("Supabase no ha retornat dades després de la inserció tot i no haver error.");
         return { error: t('fetchError') };
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
    const t = await getTranslations('DepartmentActions');
     if (isNaN(departmentId) || departmentId <= 0) { return { error: t('invalidId') }; }
     console.log(`--- [Server Action] Intentant eliminar departament ID: ${departmentId} ---`);
     const sessionInfo = await validateUserSession();
     if ('error' in sessionInfo) { return { error: sessionInfo.error.message }; }
     const supabase = createServerActionClient<Database>({ cookies });
     // TODO: Comprovació de Permisos
     const { count, error: checkError } = await supabase
         .from('tasks')
         .select('*', { count: 'exact', head: true })
         .eq('department_id', departmentId);
     if (checkError) { console.error("Error comprovant l'ús del departament:", checkError); return { error: t('usageCheckError') }; }
     if (count !== null && count > 0) { return { error: t('deleteConstraint', { count }) }; }
     const { error } = await supabase.from('departments').delete().eq('id', departmentId);
     if (error) { console.error("Error eliminant departament de Supabase:", error); return { error: t('dbError', { message: error.message }) }; }
     console.log(`Departament ID: ${departmentId} eliminat correctament.`);
     revalidatePath('/[locale]/(app)/dashboard', 'layout');
     revalidatePath('/[locale]/(app)/crm/calendari', 'layout');
     return { success: true };
}