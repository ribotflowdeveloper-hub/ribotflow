// src/app/[locale]/(app)/settings/profile/_components/ProfileData.tsx

import { validatePageSession } from '@/lib/supabase/session';
import { getActiveTeam } from '@/lib/supabase/teams';
import { ProfileForm } from "./ProfileForm";
import type { Profile, Team } from "@/types/settings";
import { Role } from '@/lib/permissions/permissions.config';

export async function ProfileData() {
  const { supabase, user } = await validatePageSession();

  const activeTeamId = user.app_metadata.active_team_id;

  // Fem les consultes en paral·lel per a màxima eficiència
  const [profileRes, team, memberRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // Només cridem a getActiveTeam si realment hi ha un ID, sinó passem null.
    activeTeamId ? getActiveTeam(supabase, activeTeamId) : Promise.resolve(null),
    activeTeamId ? supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single() : Promise.resolve({ data: null })
  ]);
  
  const profile = profileRes.data as Profile | null;
  const role = memberRes?.data?.role as Role | null;

  return (
    <ProfileForm 
      email={user.email || ''}
      // Assegurem que profile mai sigui null per evitar errors
      profile={profile!} 
      team={team as Team | null}
      role={role}
    />
  );
}