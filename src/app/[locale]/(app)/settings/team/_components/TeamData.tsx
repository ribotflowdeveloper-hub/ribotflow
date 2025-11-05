// /src/app/[locale]/(app)/settings/team/_components/TeamData.tsx (FITXER COMPLET - CORREGIT)
import { createClient } from "@/lib/supabase/server";
import { TeamDashboard } from "./TeamDashboard"; // El component de client
import type { User } from "@supabase/supabase-js";

// ✅ 1. Importem TOT el que necessitem
import * as teamService from '@/lib/services/settings/team/team.service';
import type { ActiveTeamData } from '@/lib/services/settings/team/team.service';
import { getUserTeamContext } from '@/lib/supabase/teamContext';
import { getUsageLimitStatus, getFeatureFlagStatus } from '@/lib/subscription/subscription';
import type { UsageCheckResult } from '@/lib/subscription/subscription';

interface TeamDataProps {
  user: User;
  member: { role: string }; // Aquesta prop ja la rebies d'ActiveTeamManagerData
  activeTeamId: string;
}

export async function TeamData({ user, member, activeTeamId }: TeamDataProps) {
  const supabase = createClient();

  // ✅ 2. Obtenim el context (Rol i Pla)
  // Passem el 'role' que ja tenim per optimitzar
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  // ✅ 3. Obtenim límits, features i les dades de l'equip en paral·lel
  const [teamMemberUsage, roleManagementFeature, activeTeamData] = await Promise.all([
    getUsageLimitStatus('maxTeamMembers'),        // Comprovem el límit 'maxTeamMembers'
    getFeatureFlagStatus('hasRoleManagement'),  // Comprovem el feature flag 'hasRoleManagement'
    teamService.getActiveTeamData(            // Obtenim les dades de l'equip (membres, etc.)
      supabase,
      activeTeamId,
      user.id,
      context.role ?? member.role // Passem el rol (del context o de la verificació)
    )
  ]);
  
  // ✅ 4. Renderitzem el component de Dashboard
  // Ara li passem TOTES les props que espera
  return (
    <TeamDashboard 
      user={user} 
      activeTeamData={activeTeamData as ActiveTeamData}
      permissions={{
        canManageTeam: context.role === 'owner' || context.role === 'admin',
        isOwner: context.role === 'owner',
      }}
      limits={{
        teamMembers: teamMemberUsage as UsageCheckResult,
      }}
      features={{
        canManageRoles: roleManagementFeature.enabled,
      }}
    />
  );
}