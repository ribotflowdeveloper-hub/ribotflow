import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { validatePageSession } from '@/lib/supabase/session';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/permissions.config';
import { BlacklistData } from './_components/BlacklistData';
import { BlacklistSkeleton } from './_components/BlacklistSkeleton';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

type BlacklistPageProps = {
  params: { locale: string };
};

export async function generateMetadata({ params }: BlacklistPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SettingsPage.blacklist' });
  return { title: `${t('metaTitle')} | Ribot` };
}


export default async function BlacklistPage() {
  const { supabase, user, activeTeamId } = await validatePageSession();

  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .match({ user_id: user.id, team_id: activeTeamId })
    .single();

  if (!hasPermission(member?.role as Role, PERMISSIONS.VIEW_BLACKLIST)) {
    return <AccessDenied message="No tens permisos per a veure aquesta secció." />;
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<BlacklistSkeleton />}>
        <BlacklistData currentUserRole={(member?.role as Role) || null} />
      </Suspense>
    </div>
  );
}