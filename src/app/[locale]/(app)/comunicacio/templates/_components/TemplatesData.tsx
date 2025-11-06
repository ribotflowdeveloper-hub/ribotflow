// /src/app/[locale]/(app)/comunicacio/templates/_components/TemplatesData.tsx (FITXER CORREGIT)
import { TemplatesClient } from './templates-client';
// ✅ CORRECCIÓ: Importem els guardians des de 'permissions'
import { validateSessionAndPermission, PERMISSIONS } from "@/lib/permissions/permissions";
import { AccessDenied } from '@/components/shared/AccessDenied';
import { getUsageLimitStatus, type UsageCheckResult } from "@/lib/subscription/subscription"; 
import * as templatesService from '@/lib/services/comunicacio/templates.service';
import type { EmailTemplate } from '@/types/db';

const defaultLimit: UsageCheckResult = { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };

export async function TemplatesData() {
    
    // ✅ Validació de ROL primer
    const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_TEMPLATES);
    if ('error' in validation) {
        return <AccessDenied message={validation.error.message} />;
    }
    const { supabase, activeTeamId } = validation;

    let templates: EmailTemplate[] = [];
    let limitCheck: UsageCheckResult = defaultLimit;

    try {
        // Carreguem dades i límits en paral·lel
        const [templatesResult, limitResult] = await Promise.all([
            templatesService.getTemplates(supabase, activeTeamId),
            getUsageLimitStatus('maxEmailTemplates')
        ]);
        
        templates = templatesResult;
        limitCheck = limitResult;

    } catch (error) {
        console.error((error as Error).message);
        return <TemplatesClient 
                 initialTemplates={[]} 
                 limitStatus={{ ...defaultLimit, error: (error as Error).message }} 
               />;
    }

    return (
        <TemplatesClient 
          initialTemplates={templates} 
          limitStatus={limitCheck} // Passem el límit al client
        />
    );
}