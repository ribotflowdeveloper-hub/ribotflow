// src/app/[locale]/(app)/settings/blacklist/_components/BlacklistData.tsx (FITXER CORREGIT I NET)
import { getTranslations } from 'next-intl/server';
import { BlacklistClient } from './BlacklistClient';
import { validatePageSession } from '@/lib/supabase/session';
import type { Role } from '@/lib/permissions/permissions.config';

// ✅ 1. Importem el NOU servei i els seus tipus
import * as blacklistService from '@/lib/services/settings/blacklist/blacklist.service';

interface BlacklistDataProps {
  currentUserRole: Role | null;
}

export async function BlacklistData({ currentUserRole }: BlacklistDataProps) {
  const t = await getTranslations('SettingsPage.blacklist');
  
  // ✅ 2. Validació de sessió neta
  const { supabase, activeTeamId } = await validatePageSession();

  // ✅ 3. Crida al SERVEI per obtenir dades
  // Tota la lògica de 'select', 'filter' i 'map' s'ha mogut al servei.
  const formattedRules = await blacklistService.getBlacklistRules(
    supabase,
    activeTeamId
  );

  // 4. Renderitzat del Client Component
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">{t('pageDescription')}</p>
      <BlacklistClient 
        initialRules={formattedRules} 
        currentUserRole={currentUserRole}
      />
    </div>
  );
}