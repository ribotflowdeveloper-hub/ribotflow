import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SocialPlannerClient } from './_components/SocialPlannerClient';
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { UpgradePlanNotice } from '@/app/[locale]/(app)/settings/billing/_components/UpgradePlanNotice';
import { headers } from 'next/headers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AccessDenied } from '@/components/shared/AccessDenied'; // Un component que mostra un missatge d'error

export default async function SocialPlannerPage() {
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Comprovació de pla i de seguretat
    const activeTeamPlan = user.app_metadata?.active_team_plan;
    const allowedPlans = ['plus', 'premium'];
    if (!activeTeamPlan || !allowedPlans.includes(activeTeamPlan)) {
        return <UpgradePlanNotice featureName="Planificador Social" requiredPlan="Plus" locale={locale} />;
    }

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return redirect('/settings/team');
    }

    // ✅ CONSULTA SIMPLIFICADA: RLS filtrarà automàticament per l'equip actiu.
    const { data: posts, error } = await supabase
        .from('social_posts')
        .select('*') // Ja no cal filtrar per user_id ni team_id
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error carregant les publicacions (pot ser per RLS):", error);
    }

    // La càrrega de les connexions ara ha de ser híbrida
    const [userCredsRes, teamCredsRes] = await Promise.all([
        supabase.from('user_credentials').select('provider').eq('user_id', user.id),
        supabase.from('team_credentials').select('provider').eq('team_id', activeTeamId)
    ]);
    const userProviders = userCredsRes.data?.map(c => c.provider) || [];
    const teamProviders = teamCredsRes.data?.map(c => c.provider) || [];
    const allConnectedProviders = new Set([...userProviders, ...teamProviders]);

    const connectionStatuses = {
        linkedin: allConnectedProviders.has('linkedin'),
        facebook: allConnectedProviders.has('facebook'),
        instagram: allConnectedProviders.has('instagram'),
    };

    const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: user.id, team_id: activeTeamId })
        .single();

    // ✅ Comprovem el permís per a veure aquesta pàgina
    if (!hasPermission(member?.role, PERMISSIONS.VIEW_BILLING)) {
        // Si no té permís, mostrem un missatge d'accés denegat o redirigim
        return <AccessDenied />;
    }
    return (
        <Suspense fallback={<div>Carregant planificador...</div>}>
            <SocialPlannerClient
                initialPosts={(posts as SocialPost[]) || []}
                connectionStatuses={connectionStatuses}
            />
        </Suspense>
    );
}