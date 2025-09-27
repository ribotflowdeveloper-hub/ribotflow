// /app/[locale]/invitation/accept/page.tsx

import { Suspense } from 'react';
import { InvitedSignupForm } from './_components/InvitedSignupForm';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Assegura que els paràmetres de cerca estiguin sempre disponibles
export const dynamic = 'force-dynamic';

type InvitedSignupPageProps = {
    searchParams: { 
        invite_token?: string; 
        email?: string;
    };
};

export default async function InvitedSignupPage({ searchParams }: InvitedSignupPageProps) {
      // Afegeix 'await' per a resoldre els paràmetres de manera segura
  const resolvedSearchParams = await searchParams;
  const { invite_token, email } = resolvedSearchParams;
    let teamName = 'un equip'; // Nom de l'equip per defecte

    // Encara podem intentar obtenir el nom de l'equip per a una millor experiència d'usuari.
    // Aquesta consulta es fa des del servidor i pot utilitzar RLS si està ben configurada.
    if (invite_token) {
        const supabase = createClient(cookies());
        const { data: invitationData } = await supabase
            .from('invitations')
            .select('team_name')
            .eq('token', invite_token)
            .single();
        
        if (invitationData?.team_name) {
            teamName = invitationData.team_name;
        }
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