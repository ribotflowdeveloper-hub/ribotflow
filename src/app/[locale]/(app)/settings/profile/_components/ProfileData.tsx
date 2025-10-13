import { validatePageSession } from '@/lib/supabase/session';
import { getActiveTeam } from '@/lib/supabase/teams'; // ✅ 1. Importem la nostra funció robusta
import { ProfileForm } from "./ProfileForm";
import type { Profile, Team } from "@/types/settings";
import { Role } from '@/lib/permissions.config';

export async function ProfileData() {
  const { supabase, user } = await validatePageSession();

  // Obtenim l'ID de l'equip actiu des del token, que és la font més fiable
  const activeTeamId = user.app_metadata.active_team_id;

  // Si no hi ha equip actiu, només carreguem el perfil
  if (!activeTeamId) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return (
      <ProfileForm 
        email={user.email || ''}
        profile={profile as Profile} 
        team={null}
        role={null}
      />
    );
  }

  // ✅ 2. Fem les consultes en paral·lel per a màxima eficiència
  const [profileRes, teamRes, memberRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getActiveTeam(), // Reutilitzem la nostra funció! Ja sap quin equip obtenir.
    supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single()
  ]);
  
  const profile = profileRes.data as Profile | null;
  const team = teamRes as Team | null; // getActiveTeam ja retorna l'objecte correcte
  const role = memberRes.data?.role as Role | null;

  return (
    <ProfileForm 
      email={user.email || ''}
      profile={profile as Profile} 
      team={team}
      role={role}
    />
  );
}