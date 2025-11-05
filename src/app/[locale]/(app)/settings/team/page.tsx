// /src/app/[locale]/(app)/settings/team/page.tsx (FITXER COMPLET - CORREGIT)
import { validatePageSession } from '@/lib/supabase/session';
import { TeamSelectorData } from './_components/TeamSelectorData';
import { ActiveTeamManagerData } from './_components/ActiveTeamManagerData';

export const dynamic = 'force-dynamic';

// ✅ CORRECCIÓ 1: Definim searchParams com una Promise
interface TeamSettingsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function TeamSettingsPage({ searchParams }: TeamSettingsPageProps) {
  // La validació de sessió (que inclou la redirecció si no hi ha usuari/equip actiu)
  const { user, activeTeamId } = await validatePageSession();

  // ✅ CORRECCIÓ 2: Fem 'await' dels searchParams
  const { view } = await searchParams;

  if (view === 'select' || !activeTeamId) {
    // La vista de selecció d'equip/lobby es crida si no hi ha equip actiu 
    // o si el paràmetre 'view=select' està present.
    
    // ✅ CORRECCIÓ 3: Passem 'user.id' (string) com espera el teu 'TeamSelectorData.tsx'
    return <TeamSelectorData userId={user.id} />;
  }

  // Si hi ha un equip actiu, mostrem el panell de gestió.
  return <ActiveTeamManagerData user={user} activeTeamId={activeTeamId} />;
}