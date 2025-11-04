// src/app/[locale]/(app)/settings/profile/_components/ProfileData.tsx (FITXER CORREGIT I NET)
import { validatePageSession } from '@/lib/supabase/session';
import { ProfileForm } from "./ProfileForm";
import type { Role } from '@/lib/permissions/permissions.config';

// ✅ 1. Importem el NOU servei i els tipus de domini
import * as profileService from '@/lib/services/settings/profile/profile.service';
import type { Profile, Team } from "@/types/settings"; // Assegurem que importem Profile

export async function ProfileData() {
  
  const { supabase, user } = await validatePageSession();
  const activeTeamId = user.app_metadata.active_team_id || null;

  // 2. Cridem al SERVEI per obtenir dades
  const { profile, team, role } = await profileService.getProfilePageData(
    supabase,
    user,
    activeTeamId
  );

  // ✅ 3. AQUESTA ÉS LA CORRECCIÓ DE L'ERROR
  // Creem un objecte 'default' que satisfà el tipus 'Profile' complet
  const defaultProfile: Profile = {
    id: user.id,
    full_name: '',
    phone: null,
    job_title: null,
    avatar_url: null,
    onboarding_completed: false,
    // Afegeix aquí qualsevol altra propietat no-nul·la que 'Profile' pugui requerir
    // per exemple, si 'created_at' fos requerit (tot i que normalment és opcional):
    // created_at: new Date().toISOString(), 
  };

  // 4. Renderitzat del Client Component
  // Passem el 'profile' real si existeix, o el 'defaultProfile' complet si no.
  return (
    <ProfileForm 
      email={user.email || ''}
      profile={profile || defaultProfile} // ✅ Ara sempre és un tipus 'Profile' vàlid
      team={team as Team | null} // 'team' pot ser null
      role={role}
    />
  );
}