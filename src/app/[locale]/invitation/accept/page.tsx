// /app/[locale]/invitation/accept/page.tsx (VERSIÓ FINAL)

import { InvitedSignupForm } from './_components/InvitedSignupForm';
import { createClient } from '@/lib/supabase/server';

// Assegura que la pàgina sempre es renderitza dinàmicament per a llegir els searchParams.
export const dynamic = 'force-dynamic';

type InvitedSignupPageProps = {
    searchParams: { 
        // ✅ CORRECCIÓ: El paràmetre es diu 'token', no 'invite_token'.
        token?: string; 
        email?: string;
    };
};

export default async function InvitedSignupPage({ searchParams }: InvitedSignupPageProps) {
    // ✅ MILLORA: Ja no necessitem 'await searchParams' aquí.
    const { token, email } = searchParams;
    let teamName: string | null = null; // Ho inicialitzem a null per a més claredat.

    if (token) {
        const supabase = createClient();
        const { data: invitationData } = await supabase
            .from('invitations')
            .select('team_name')
            .eq('token', token)
            .single();
        
        if (invitationData?.team_name) {
            teamName = invitationData.team_name;
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
            {/* ✅ MILLORA: Suspense no és necessari aquí. */}
            <InvitedSignupForm 
                inviteToken={token}
                invitedEmail={email}
                teamName={teamName}
            />
        </div>
    );
}