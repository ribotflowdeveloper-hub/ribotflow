"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function resolveInvitationAction(token: string) {
  if (!token) {
    return redirect('/login?message=Token d\'invitació invàlid.');
  }

  const supabaseAdmin = createAdminClient();
  const { data: invitation } = await supabaseAdmin.from('invitations').select('email').eq('token', token).single();
  if (!invitation) {
    return redirect('/login?message=La teva invitació és invàlida o ha caducat.');
  }

  // ✅ CORRECCIÓ: Obtenim la llista completa i la filtrem a la memòria.
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Error en obtenir la llista d'usuaris:", listError);
    return redirect('/login?message=Hi ha hagut un error al servidor.');
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

  if (!user) {
    return redirect(`/login?invite_token=${token}&message=Has d'iniciar sessió per acceptar.`);
  }

  try {
    const { data: invitation } = await supabase.from('invitations').select('*').eq('token', token).single().throwOnError();
    if (invitation.email !== user.email) {
      throw new Error("Aquesta invitació està destinada a un altre usuari.");
    }

    await supabase.from('team_members').insert({ 
      team_id: invitation.team_id, 
      user_id: user.id, 
      role: invitation.role 
    }).throwOnError();
    
    const { data: subscription } = await supabase.from('subscriptions').select('plan_id, status').eq('team_id', invitation.team_id).single();
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
        const message = error instanceof Error ? error.message : "Error en processar la invitació.";
        return redirect(`/dashboard?message=${encodeURIComponent(message)}`);
    }
  }

  redirect('/settings/team');
}

