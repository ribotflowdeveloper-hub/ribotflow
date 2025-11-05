// /src/app/[locale]/(app)/settings/team/_components/ActiveTeamManagerData.tsx (FITXER COMPLET - CORREGIT)
import { createClient } from "@/lib/supabase/server";
import { TeamDashboard } from "./TeamDashboard"; // El component de client
import type { User } from "@supabase/supabase-js";

// Importem el servei de dades de l'equip
import * as teamService from '@/lib/services/settings/team/team.service';
import type { ActiveTeamData } from '@/lib/services/settings/team/team.service';

// ✅ Importem els nostres nous "helpers" de permisos i límits
import { getUserTeamContext } from '@/lib/supabase/teamContext';
import { getUsageLimitStatus, getFeatureFlagStatus } from '@/lib/subscription/subscription';
import type { UsageCheckResult } from '@/lib/subscription/subscription';
import { TeamStateCorrector } from "./TeamStateCorrector";

interface ActiveTeamManagerDataProps {
  user: User;
  activeTeamId: string;
}

export async function ActiveTeamManagerData({ user, activeTeamId }: ActiveTeamManagerDataProps) {
  const supabase = createClient();

  // 1. Validem que l'usuari és membre (aquesta lògica teva és correcte)
  const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .match({ user_id: user.id, team_id: activeTeamId })
      .single();

  if (!member || memberError) {
      // Si no és membre, corregim l'estat (perfecte)
      return <TeamStateCorrector />;
  }

  // 2. Obtenim el context (Rol i Pla)
  // Nota: Passem el 'role' que ja tenim per estalviar una crida si 'getUserTeamContext' ho sap aprofitar.
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  // 3. Obtenim límits, features i dades de l'equip en paral·lel
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
  
  // 4. Renderitzem el component de Dashboard
  // ✅ Ara li passem TOTES les props que espera (user, activeTeamData, permissions, limits, features)
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