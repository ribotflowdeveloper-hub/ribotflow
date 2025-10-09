import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { validatePageSession } from '@/lib/supabase/session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { BlacklistData } from './_components/BlacklistData';
import { BlacklistSkeleton } from './_components/BlacklistSkeleton';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

// ✅ REFACTORITZACIÓ: Metadades dinàmiques per a la internacionalització.
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'SettingsPage.blacklist' });
  return { title: `${t('metaTitle')} | Ribot` };
}

/**
 * Pàgina de la Blacklist.
 * Valida la sessió i els permisos de l'usuari abans de renderitzar el contingut.
 */
export default async function BlacklistPage() {
  const { supabase, user, activeTeamId } = await validatePageSession();

  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .match({ user_id: user.id, team_id: activeTeamId })
    .single();

  // ✅ REFACTORITZACIÓ: Comprovació de permís per a VEURE la pàgina.
  if (!hasPermission(member?.role, PERMISSIONS.VIEW_BLACKLIST)) {
    return <AccessDenied message="No tens permisos per a veure aquesta secció." />;
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<BlacklistSkeleton />}>
        <BlacklistData currentUserRole={member?.role || null} />
      </Suspense>
    </div>
  );
}
