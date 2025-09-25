// /app/[locale]/settings/profile/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Actualiza los datos PERSONALES del usuario en la tabla 'profiles'.
 * (Aquesta funció no necessita canvis).
 */
export async function updateUserProfileAction(formData: FormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado." };

    const profileData = {
        full_name: formData.get('full_name') as string,
        phone: formData.get('phone') as string,
        job_title: formData.get('job_title') as string,
        avatar_url: formData.get('avatar_url') as string,
    };

    const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

    if (error) return { success: false, message: `Error al actualizar el perfil: ${error.message}` };

    revalidatePath('/settings/profile');
    return { success: true, message: "Perfil personal actualizado." };
}

/**
 * Actualiza los datos DE LA EMPRESA de l'equip ACTIU.
 */
export async function updateTeamAction(formData: FormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado." };

    // ✅ PAS 1: Obtenim l'equip actiu del token. Aquesta és la font de la veritat.
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { success: false, message: "No tienes ningún equipo activo seleccionado." };
    }

    // ✅ PAS 2: Comprovació de seguretat robusta.
    // Verifiquem que l'usuari és membre de l'equip actiu i que el seu rol
    // li permet editar (owner o admin).
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', activeTeamId)
        .single();

    if (memberError || !member) {
        return { success: false, message: "No se ha encontrado tu rol en este equipo." };
    }
    
    const allowedRoles = ['owner', 'admin'];
    if (!allowedRoles.includes(member.role)) {
        return { success: false, message: "No tienes permisos para editar este equipo. Contacta con el propietario." };
    }

    // ✅ PAS 3: Obtenim les dades del formulari.
    const teamData = {
        name: formData.get('name') as string,
        tax_id: formData.get('tax_id') as string,
        address: formData.get('address') as string,
        phone: formData.get('company_phone') as string,
        email: formData.get('company_email') as string,
        website: formData.get('website') as string,
        summary: formData.get('summary') as string,
        sector: formData.get('sector') as string,
        logo_url: formData.get('logo_url') as string,
    };

    // ✅ PAS 4: Actualitzem l'equip actiu.
    const { error } = await supabase
        .from('teams')
        .update(teamData)
        .eq('id', activeTeamId);

    if (error) return { success: false, message: `Error al actualizar la empresa: ${error.message}` };

    revalidatePath('/settings/profile');
    return { success: true, message: "Datos de la empresa actualizados." };
}