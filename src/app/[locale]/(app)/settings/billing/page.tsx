import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BillingData } from './_components/BillingData';
import { BillingSkeleton } from './_components/BillingSkeleton';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
// ✅ 1. Importem el tipus 'Role' des del fitxer de configuració de permisos.
import { type Role } from '@/lib/permissions.config';

export const dynamic = 'force-dynamic';

interface BillingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: BillingPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'SettingsPage.billing' });
  return { title: `${t('metaTitle')} | Ribot` };
}

export default async function BillingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeTeamId = user.app_metadata?.active_team_id;
  if (!activeTeamId) redirect('/settings/team');

  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .match({ user_id: user.id, team_id: activeTeamId })
    .single();

  // ✅ 2. Fem una asserció de tipus per dir-li a TypeScript que 'member.role' és un 'Role'.
  if (!hasPermission(member?.role as Role, PERMISSIONS.VIEW_BILLING)) {
    return <AccessDenied />;
  }

  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingData />
    </Suspense>
  );
}