import { Suspense } from 'react';
import { InvitedSignupForm } from './_components/InvitedSignupForm';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// AFEGEIX AQUESTA LÍNIA. Soluciona l'error de 'searchParams'.
// Força que aquesta pàgina s'executi sempre al servidor en el moment
// de la petició, donant-li accés als paràmetres de la URL.
export const dynamic = 'force-dynamic';

type InvitedSignupPageProps = {
  searchParams: { 
    invite_token?: string; 
    email?: string;
  };
};

export default async function InvitedSignupPage({ searchParams }: InvitedSignupPageProps) {
  const { invite_token, email } = searchParams;
  let teamName = null;

  if (invite_token) {
    const supabase = createClient(cookies());
    const { data: invitationData, error } = await supabase
      .from('invitations')
      .select('teams ( name )')
      .eq('token', invite_token)
      .single();

    // Comprovació de seguretat simplificada i robusta.
    // Si hi ha un error o no trobem la invitació o l'equip associat, redirigim.
    if (error || !invitationData || !invitationData.teams) {
      return redirect('/login?message=La teva invitació és invàlida o ha caducat.');
    }
    
    // Amb .single() i una relació de clau forana, 'teams' és un objecte, no un array.
    teamName = invitationData.teams[0]?.name;

  } else {
    // Si no hi ha token a la URL, no podem continuar.
    return redirect('/login?message=Falta el token d\'invitació.');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <Suspense>
        <InvitedSignupForm 
            inviteToken={invite_token}
            invitedEmail={email}
            teamName={teamName}
        />
      </Suspense>
    </div>
  );
}

