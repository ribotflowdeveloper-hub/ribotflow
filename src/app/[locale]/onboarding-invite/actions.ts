"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function updateInvitedUserProfileAction(formData: FormData) {
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    if (!fullName || fullName.trim().length < 2) {
        return { success: false, message: "El nom és obligatori." };
    }

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone || null })
        .eq('id', user.id);
    
    if (error) {
        return { success: false, message: error.message };
    }

    // Un cop completat el perfil, el redirigim a la pàgina de l'equip.
    redirect('/settings/team');
}