import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { validatePageSession } from '@/lib/supabase/session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { BillingData } from './_components/BillingData';
import { BillingSkeleton } from './_components/BillingSkeleton';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'SettingsPage.billing' });
  return { title: `${t('metaTitle')} | Ribot` };
}

/**
 * Pàgina de Facturació.
 * Valida la sessió i els permisos abans de renderitzar el contingut.
 */
export default async function BillingPage() {
  const { supabase, user, activeTeamId } = await validatePageSession();

  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .match({ user_id: user.id, team_id: activeTeamId })
    .single();

  if (!hasPermission(member?.role, PERMISSIONS.VIEW_BILLING)) {
    return <AccessDenied message="No tens permisos per a veure la facturació." />;
  }
  
  // Passem el rol com a prop a BillingData per evitar una altra consulta a la BD.
  const currentUserRole = member?.role || null;

  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingData currentUserRole={currentUserRole} />
    </Suspense>
  );
}
