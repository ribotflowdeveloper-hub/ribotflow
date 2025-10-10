import { validatePageSession } from '@/lib/supabase/session';
import { ProfileForm } from "./ProfileForm";
import type { Profile, Team } from "@/types/settings";

export async function ProfileData() {
  // ✅ MILLORA: Usem el helper per validar la sessió i obtenir les dades en una sola línia.
  const { supabase, user } = await validatePageSession();

  // Obtenim el perfil de l'usuari i les dades del seu equip/rol alhora.
  const [profileRes, memberRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('team_members').select('role, teams(*)').eq('user_id', user.id).eq('team_id', user.app_metadata.active_team_id).single()
  ]);
  
  const profile = profileRes.data;
  const team = Array.isArray(memberRes.data?.teams) && memberRes.data.teams.length > 0
    ? memberRes.data.teams[0] as Team
    : null;
  const role = memberRes.data?.role as 'owner' | 'admin' | 'member' | null;

  if (user.app_metadata.active_team_id && !memberRes.data) {
    console.warn(`[SERVER] AVÍS: Inconsistència de dades. L'usuari té un active_team_id però no és membre.`);
  }

  return (
    <ProfileForm 
      email={user.email || ''}
      profile={profile as Profile} 
      team={team}
      role={role}
    />
  );
}