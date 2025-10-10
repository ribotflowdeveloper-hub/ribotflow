// /src/app/[locale]/(app)/settings/team/page.tsx

import { validatePageSession } from '@/lib/supabase/session';
import { TeamSelectorData } from './_components/TeamSelectorData';
import { ActiveTeamManagerData } from './_components/ActiveTeamManagerData';

// Mantenim l'ordre a Next.js per assegurar el renderitzat dinàmic
export const dynamic = 'force-dynamic';

// Podem mantenir els tipus aquí o moure'ls a un fitxer types.ts si prefereixes
export type Team = { id: string; name: string; };
export type Invitation = { id: string; email: string; role: string; };
export type UserTeam = { role: string; teams: Team | null; };
export type PersonalInvitation = { id: string; team_name: string; inviter_name: string };
export type ProfileInfo = { id: string; full_name: string | null; email: string | null; avatar_url: string | null; };
export type TeamMember = { role: string; profiles: ProfileInfo | null; };
export type ActiveTeamData = {
    team: Team;
    teamMembers: TeamMember[];
    pendingInvitations: Invitation[];
    currentUserRole: string;
    inboxPermissions: { grantee_user_id: string; target_user_id: string; }[];
};

export default async function TeamSettingsPage({ searchParams }: { searchParams: { view?: string } }) {
    const { user, activeTeamId } = await validatePageSession();

    // ✅ Desestructurem searchParams amb await
    const { view } = await searchParams;

    if (view === 'select' || !activeTeamId) {
        return <TeamSelectorData userId={user.id} />;
    }

    return <ActiveTeamManagerData user={user} activeTeamId={activeTeamId} />;
}
