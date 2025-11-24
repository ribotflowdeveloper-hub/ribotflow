"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTranslations } from 'next-intl/server';

export async function resolveInvitationAction(token: string) {
  const t = await getTranslations('Invitation');
  if (!token) {
    return redirect(`/login?message=${t('invalidToken')}`);
  }

  const supabaseAdmin = createAdminClient();
  const { data: invitation } = await supabaseAdmin.from('invitations').select('email').eq('token', token).single();
  if (!invitation) {
    return redirect(`/login?message=${t('expiredToken')}`);
  }

  // ✅ CORRECCIÓ: Obtenim la llista completa i la filtrem a la memòria.
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Error en obtenir la llista d'usuaris:", listError);
    return redirect(`/login?message=${t('serverError')}`);
  }

  const existingUser = users.find(u => u.email === invitation.email);

  if (existingUser) {
    redirect(`/login?invite_token=${token}&email=${encodeURIComponent(invitation.email)}`);
  } else {
    redirect(`/invitation/accept?invite_token=${token}&email=${encodeURIComponent(invitation.email)}`);
  }
}

export async function acceptInviteAction(token: string) {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
const t = await getTranslations('AuthActions');

  if (!user) {
    return redirect(`/login?invite_token=${token}&message=${t('loginRequired')}`);
  }

  try {
    const { data: invitation } = await supabase.from('invitations').select('*').eq('token', token).single().throwOnError();
    if (invitation.email !== user.email) {
      throw new Error(t('wrongUser'));
    }

    await supabase.from('team_members').insert({ 
      team_id: invitation.team_id ?? '', 
      user_id: user.id, 
      role: invitation.role 
    }).throwOnError();
    
    const { data: subscription } = await supabase.from('subscriptions').select('plan_id, status').eq('team_id', invitation.team_id ?? '').single();
    const teamPlan = (subscription?.status === 'active') ? subscription.plan_id : 'free';

    await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
            app_metadata: {
                ...user.app_metadata,
                active_team_id: invitation.team_id,
                active_team_plan: teamPlan
            }
        }
    );
    await supabase.auth.refreshSession();
    await supabase.from('invitations').delete().eq('id', invitation.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key value')) {
        console.log("L'usuari ja era membre, procedint a actualitzar el seu token...");
    } else {
        const message = error instanceof Error ? error.message : t('processingError');
        return redirect(`/dashboard?message=${encodeURIComponent(message)}`);
    }
  }

  redirect('/settings/team');
}

