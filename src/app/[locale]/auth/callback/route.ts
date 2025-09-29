import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard'; // Per defecte, anem al dashboard
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    if (code) {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        const { error, data: { user } } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && user) {
            const inviteToken = new URL(`${origin}${next}`).searchParams.get('token');

            // CAS 1: L'usuari ve amb una invitació
            if (inviteToken) {
                const supabaseAdmin = createAdminClient();
                const { data: invitation } = await supabaseAdmin.from('invitations').select('*').eq('token', inviteToken).single();

                if (invitation) {
                    await supabaseAdmin.from('team_members').insert({ team_id: invitation.team_id, user_id: user.id, role: invitation.role });
                    const { data: subscription } = await supabaseAdmin.from('subscriptions').select('plan_id, status').eq('team_id', invitation.team_id).single();
                    const teamPlan = (subscription?.status === 'active') ? subscription.plan_id : 'free';

                    await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { active_team_id: invitation.team_id, active_team_plan: teamPlan } });
                    await supabaseAdmin.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
                    await supabaseAdmin.from('invitations').delete().eq('id', invitation.id);
                    // ✅ PAS CRUCIAL: Forcem el refresc de la sessió per a actualitzar la cookie

                    await supabase.auth.refreshSession();
                    // Després de gestionar la invitació, el portem directament al dashboard
                    return NextResponse.redirect(`${origin}/${locale}/dashboard`);
                }
            }

            // CAS 2: Usuari normal (sense invitació)
            const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
            if (profile && !profile.onboarding_completed) {
                return NextResponse.redirect(`${origin}/${locale}/onboarding`);
            }

            // Per a la resta de casos, el portem a la seva destinació (normalment, el dashboard)
            return NextResponse.redirect(`${origin}/${locale}${next.split('?')[0]}`);
        }
    }

    return NextResponse.redirect(`${origin}/${locale}/login?error=auth_failed`);
}