// /app/[locale]/invitation/accept/page.tsx (VERSIÓ FINAL)

import { InvitedSignupForm } from './_components/InvitedSignupForm';
import { createClient } from '@/lib/supabase/server';

// Assegura que la pàgina sempre es renderitza dinàmicament per a llegir els searchParams.
export const dynamic = 'force-dynamic';

// ✅ CORRECCIÓ CLAU: Definim searchParams com una Promise.
type InvitedSignupPageProps = {
    searchParams: Promise<{ 
        token?: string; 
        email?: string;
    }>;
};

export default async function InvitedSignupPage({ searchParams }: InvitedSignupPageProps) {
    console.log("Search params a la pàgina d'acceptació d'invitació:", searchParams);
    
    // ✅ L'await és ara consistent amb el tipus definit (Promise<T>).
    const { token, email } = await searchParams;
    let teamName: string | null = null; 

    if (token) {
        // Utilitzem createClient() des del servidor [8]
        const supabase = createClient();
        
        // Consulta per obtenir el nom de l'equip a partir del token [9]
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
            <InvitedSignupForm 
                inviteToken={token}
                invitedEmail={email}
                teamName={teamName}
            />
        </div>
    );
}