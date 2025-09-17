import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { NetworkClient } from './_components/NetworkClient';
import { getTranslations } from 'next-intl/server';
import type { PublicProfile } from '@/types/network';

// La revalidació cada hora és una bona pràctica per a dades que no canvien constantment.
export const revalidate = 3600;

/**
 * @summary El component de servidor que carrega les dades inicials.
 */
export default async function NetworkPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const t = await getTranslations('NetworkPage');

  const { data, error } = await supabase.rpc('get_public_profiles');

  const profiles = (data as PublicProfile[]) || [];

  if (error) {
    console.error('Error en carregar els perfils:', error.message);
    return <div className="p-8 text-red-500">{t('errorLoading')}</div>;
  }

  // Passem els perfils al component de client, que s'encarregarà de la resta.
  return <NetworkClient profiles={profiles} />;
}