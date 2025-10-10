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
// ✅ CORRECCIÓ CLAU: Definim searchParams com una Promise que conté el tipus esperat.
interface TeamSettingsPageProps {
    searchParams: Promise<{ view?: string }>;
}
export default async function TeamSettingsPage({ searchParams }: TeamSettingsPageProps) {
    // La validació de sessió (que inclou la redirecció si no hi ha usuari/equip actiu)
    const { user, activeTeamId } = await validatePageSession();

    // ✅ Aquest 'await' és ara semànticament correcte i tipificat.
    const { view } = await searchParams;

    if (view === 'select' || !activeTeamId) {
        // La vista de selecció d'equip/lobby es crida si no hi ha equip actiu o si el paràmetre 'view=select' està present.
        return <TeamSelectorData userId={user.id} />;
    }

    // Si hi ha un equip actiu, mostrem el panell de gestió.
    return <ActiveTeamManagerData user={user} activeTeamId={activeTeamId} />;
}