// /app/[locale]/settings/profile/_components/ProfileData.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";
import type { Profile, Team } from "@/types/settings"; // Asegúrate de que estos tipos estén definidos correctamente

export async function ProfileData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 1. Buscamos el perfil personal del usuario
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    // 2. Buscamos si el usuario es miembro de algún equipo y obtenemos los datos del equipo y su rol
    const { data: member } = await supabase
        .from('team_members')
        .select('role, teams(*)') // Pedimos el rol y todos los datos del equipo relacionado
        .eq('user_id', user.id)
        .maybeSingle();

   // Extraiem el rol de manera segura
   const role = member?.role || null;
   const team = member?.teams || null;

    // ✅ TRAMPA DE DEPURACIÓ: Imprimim el rol que hem trobat
    console.log("--- DADES CARREGADES AL SERVIDOR ---");
    console.log("Rol de l'usuari detectat:", role);
    console.log("Equip team:", team);
    console.log("------------------------------------");
    // 3. Pasamos los datos por separado al formulario
    return (
        <ProfileForm 
            email={user.email || ''}
            profile={profile as Profile} 
            team={member?.teams as unknown as Team || null}
            role={member?.role || null}
        />
    );
}