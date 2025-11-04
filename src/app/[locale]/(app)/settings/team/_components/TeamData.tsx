// /app/[locale]/settings/team/_components/TeamData.tsx (FITXER CORREGIT I NET)
import { createClient } from "@/lib/supabase/server";
import { TeamDashboard } from "./TeamDashboard";
import type { User } from "@supabase/supabase-js";
// ✅ 1. Importem el NOU servei i els seus tipus
import * as teamService from '@/lib/services/settings/team/team.service';
import type { ActiveTeamData } from '@/lib/services/settings/team/team.service';

interface TeamDataProps {
  user: User;
  member: { role: string };
  activeTeamId: string;
}

export async function TeamData({ user, member, activeTeamId }: TeamDataProps) {
  const supabase = createClient();

  // ✅ 2. Tota la lògica de 'Promise.all' i mapatge s'ha mogut al servei.
  const activeTeamData: ActiveTeamData = await teamService.getActiveTeamData(
    supabase,
    activeTeamId,
    user.id,
    member.role
  );
  
  // 3. Renderitzem el component de Dashboard (aquest ja estava bé)
  return <TeamDashboard user={user} activeTeamData={activeTeamData} />;
}