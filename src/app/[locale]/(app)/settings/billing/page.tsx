/**
 * @file page.tsx (Billing)
 * @summary Punt d'entrada de la pàgina de Facturació, implementant Suspense.
 */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BillingData } from './_components/BillingData';
import { BillingSkeleton } from './_components/BillingSkeleton';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AccessDenied } from '@/components/shared/AccessDenied'; // Un component que mostra un missatge d'error



export const dynamic = 'force-dynamic';

// ✅ CORRECCIÓ 1: Definim la interfície de les propietats
// indicant que 'params' pot ser una promesa.
interface BillingPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Funció per generar metadades dinàmiques (el títol de la pàgina).
 */
export async function generateMetadata(props: BillingPageProps): Promise<Metadata> {
  // ✅ CORRECCIÓ 2: Fem 'await' per resoldre la promesa i obtenir els paràmetres.
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: 'SettingsPage.billing' });
  return { title: `${t('metaTitle')} | Ribot` };
}

/**
 * La pàgina principal de Facturació.
 */
export default async function BillingPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeTeamId = user.app_metadata?.active_team_id;
  if (!activeTeamId) redirect('/settings/team');
  // Obtenim el rol de l'usuari
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
    <Suspense fallback={<BillingSkeleton />}>
      <BillingData />
    </Suspense>
  );
}