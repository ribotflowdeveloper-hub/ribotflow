/**
 * @file NetworkData.tsx
 * @summary Componente de Servidor que carga los datos de los perfiles públicos.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NetworkClient } from './NetworkClient';
import { getTranslations } from 'next-intl/server';
import type { PublicProfile } from '../types';

export async function NetworkData() {
  const t = await getTranslations('NetworkPage');
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc('get_public_profiles');
  const profiles = (data as PublicProfile[]) || [];

  if (error) {
    console.error('Error al cargar los perfiles:', error.message);
    // Devuelve el cliente con una lista vacía para que pueda mostrar un mensaje de error si es necesario.
    return <NetworkClient profiles={[]} errorMessage={t('errorLoading')} />;
  }

  return <NetworkClient profiles={profiles} />;
}