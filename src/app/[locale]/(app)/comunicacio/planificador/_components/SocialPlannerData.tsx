// /app/[locale]/(app)/comunicacio/planificador/_components/SocialPlannerData.tsx (FITXER COMPLET I CORREGIT)
import { SocialPlannerClient } from './SocialPlannerClient';
// ❌ import { UpgradePlanNotice } from '@/app/[locale]/(app)/settings/billing/_components/UpgradePlanNotice'; // No es fa servir
import { AccessDenied } from '@/components/shared/AccessDenied';
import { validateSessionAndPermission, PERMISSIONS } from '@/lib/permissions/permissions'; 
import { getUsageLimitStatus} from '@/lib/subscription/subscription'; // ✅ 'UsageCheckResult' s'utilitza
import { getSocialPlannerInitialData } from '@/lib/services/comunicacio/socialPlanner.service';
import type { SocialPost, ConnectionStatuses } from '@/lib/services/comunicacio/socialPlanner.service';

export type { SocialPost, ConnectionStatuses };

export async function SocialPlannerData() {
    
    const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_SOCIAL_PLANNER);
    if ('error' in validation) {
        return <AccessDenied message={validation.error.message} />;
    }
    
    const { supabase, user, activeTeamId } = validation;
    // ❌ 'locale' no es feia servir
    // const locale = user.user_metadata?.locale || 'ca';

    const [
      { data, error },
      accountLimit,
      postLimit
    ] = await Promise.all([
        getSocialPlannerInitialData(supabase, user.id, activeTeamId),
        getUsageLimitStatus('maxSocialAccounts'),
        getUsageLimitStatus('maxSocialPostsPerMonth')
    ]);

    if (error || !data) {
        console.error("Error carregant les dades del Planificador Social (Component):", error);
        return (
            <SocialPlannerClient
                initialPosts={[]}
                connectionStatuses={{ linkedin: false, facebook: false, instagram: false }}
                accountLimitStatus={accountLimit}
                postLimitStatus={postLimit}
            />
        );
    }

    return (
        <SocialPlannerClient
            initialPosts={data.posts}
            connectionStatuses={data.connectionStatuses}
            accountLimitStatus={accountLimit}
            postLimitStatus={postLimit}
        />
    );
}