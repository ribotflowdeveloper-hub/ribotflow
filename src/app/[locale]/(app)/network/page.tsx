/**
 * @file page.tsx (Network)
 * @summary Aquest fitxer defineix la pàgina principal del mòdul de Network (Xarxa).
 * Com a Component de Servidor, la seva funció principal és carregar la llista de perfils públics
 * des de la base de dades i passar-la a un component intermedi (`NetworkLoader`),
 * que s'encarregarà de carregar la resta de la interfície interactiva.
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import NetworkLoader from '@/app/[locale]/(app)/_components/network/NetworkLoader'; // Component "pont" que gestiona la càrrega de la UI del client.
import { getTranslations } from 'next-intl/server'; // ✅ Importem el hook de servidor

// Aquesta variable de Next.js indica que el contingut d'aquesta pàgina es pot mantenir en memòria cau (cache)
// per a un màxim de 3600 segons (1 hora). Això millora el rendiment, ja que no es torna a carregar
// la llista de perfils a cada visita, només un cop cada hora.
export const revalidate = 3600;

/**
 * @function NetworkPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function NetworkPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const t = await getTranslations('NetworkPage'); // ✅ Cridem el hook

  // Cridem a una funció de PostgreSQL (RPC) per obtenir només els perfils públics.
  // Les RPC són eficients per a consultes complexes o per encapsular lògica de negoci a la base de dades.
  const { data: profiles, error } = await supabase.rpc('get_public_profiles');

  if (error) {
    console.error('Error en carregar els perfils:', error.message);
    return <div className="p-8 text-red-500">{t('errorLoading')}</div>; // ✅ Text traduït
  }

  // Passem els perfils carregats al component NetworkLoader. Aquest patró (Server -> Loader -> Client)
  // és útil per mostrar una càrrega inicial mentre els components més pesats del client (com el mapa) s'inicialitzen.
  return <NetworkLoader profiles={profiles || []} />;
}
