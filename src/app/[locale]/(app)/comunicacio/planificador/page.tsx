import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SocialPlannerClient } from './_components/SocialPlannerClient';
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { UpgradePlanNotice } from '@/app/[locale]/(app)/settings/billing/_components/UpgradePlanNotice';
import { headers } from 'next/headers';

export default async function SocialPlannerPage() {
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // ✅ TRAMPA DE DEPURACIÓ AL SERVIDOR
    console.log("\n--- DEPURACIÓ DE PERMISOS (SocialPlannerPage - SERVIDOR) ---");
    console.log("ID de l'usuari:", user.id);
    console.log("Email de l'usuari:", user.email);
    console.log("Metadata del token (app_metadata):", JSON.stringify(user.app_metadata, null, 2));
    console.log("-----------------------------------------------------------\n");

    const activeTeamPlan = user.app_metadata?.active_team_plan;
    const allowedPlans = ['plus', 'premium'];

    if (!activeTeamPlan || !allowedPlans.includes(activeTeamPlan)) {
        return (
            <UpgradePlanNotice 
                featureName="Planificador Social"
                requiredPlan="Plus"
                locale={locale}
            />
        );
    }

    // --- Si l'usuari té permís, la càrrega de dades continua ---
    const { data: posts, error } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false });
    if (error) { console.error("Error carregant les publicacions:", error); }
    
    const { data: credentials } = await supabase.from('user_credentials').select('provider').eq('user_id', user.id);
    const connectionStatuses = {
        linkedin_oidc: credentials?.some(c => c.provider === 'linkedin_oidc') || false,
        facebook: credentials?.some(c => c.provider === 'facebook') || false,
        instagram: credentials?.some(c => c.provider === 'instagram') || false,
    };

    return (
        <Suspense fallback={<div>Carregant planificador...</div>}>
            <SocialPlannerClient 
                initialPosts={(posts as SocialPost[]) || []} 
                connectionStatuses={connectionStatuses}
            />
        </Suspense>
    );
}