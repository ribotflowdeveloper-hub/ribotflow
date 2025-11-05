// /src/app/[locale]/(app)/settings/team/_components/TeamSelectorData.tsx (FITXER COMPLET - CORREGIT)
import { createClient } from "@/lib/supabase/server";
import { TeamHub } from "./TeamHub"; // El component de client
import * as teamService from '@/lib/services/settings/team/team.service';
import type { UserTeam, PersonalInvitation } from '@/lib/services/settings/team/team.service';
import { getUsageLimitStatus } from '@/lib/subscription/subscription'; // ✅ 1. Importem el helper de límits
import type { UsageCheckResult } from '@/lib/subscription/subscription';

interface TeamSelectorDataProps {
  userId: string;
}

export async function TeamSelectorData({ userId }: TeamSelectorDataProps) {
    const supabase = createClient();

    // ✅ 2. Carreguem les dades del Hub I el límit de 'maxTeams' en paral·lel.
    const [hubData, teamUsage] = await Promise.all([
      teamService.getTeamHubData(supabase, userId),
      getUsageLimitStatus('maxTeams') 
    ]);

    // Comprovem errors (la teva lògica original estava bé)
    if (!hubData.userTeams || !hubData.personalInvitations) {
       console.error("Error loading team selection data:");
       // Podem retornar un estat d'error o un component de client amb un missatge
       return <div>Error en carregar les dades de l'equip.</div>;
    }

    return (
        <TeamHub 
            userTeams={hubData.userTeams as UserTeam[]} 
            personalInvitations={hubData.personalInvitations as PersonalInvitation[]}
            
            // ✅ 3. Passem l'objecte 'teamUsage' complet al component de client
            teamUsage={teamUsage as UsageCheckResult}
        />
    );
}