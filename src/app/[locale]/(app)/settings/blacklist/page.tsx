import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { validatePageSession } from '@/lib/supabase/session';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/permissions.config';
import { BlacklistData } from './_components/BlacklistData';
import { BlacklistSkeleton } from './_components/BlacklistSkeleton';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

// ✅ CORRECCIÓ CLAU: La propietat 'params' es defineix com una Promise.
type BlacklistPageProps = {
  params: Promise<{ locale: string }>; // <-- Ho definim com a Promise
};

export async function generateMetadata(props: BlacklistPageProps): Promise<Metadata> {
  // ✅ L'await és ara compatible amb el tipus.
  const { locale } = await props.params; 
  const t = await getTranslations({ locale, namespace: 'SettingsPage.blacklist' });
  return { title: `${t('metaTitle')} | Ribot` };
}


export default async function BlacklistPage() {
  // Aquesta funció fa la validació i redirigeix si no és vàlid [5]
  const { supabase, user, activeTeamId } = await validatePageSession();

  // Comprovació de permisos (basada en el rol de l'usuari [6])
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .match({ user_id: user.id, team_id: activeTeamId })
    .single();

  if (!hasPermission(member?.role as Role, PERMISSIONS.VIEW_BLACKLIST)) {
    // Si no té permís, mostrem el component AccessDenied [2, 7]
    return <AccessDenied message="No tens permisos per a veure aquesta secció." />;
  }

  // Renderitzem el component de dades dins d'un Suspense [2].
  // La càrrega de dades real es farà a BlacklistData [8].
  return (
    <div className="space-y-6">
      <Suspense fallback={<BlacklistSkeleton />}>
        <BlacklistData currentUserRole={(member?.role as Role) || null} />
      </Suspense>
    </div>
  );
}