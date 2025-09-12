// src/app/(app)/network/page.tsx
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import NetworkLoader from '@/app/(app)/_components/network/NetworkLoader'; // 👈 Importa el nou component "pont"

export const revalidate = 3600;

export default async function NetworkPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: profiles, error } = await supabase.rpc('get_public_profiles');

  if (error) {
    console.error('Error fetching profiles:', error.message);
    return <div className="p-8 text-red-500">Error en carregar les dades de la xarxa.</div>;
  }

  // Renderitza el NetworkLoader i li passes els perfils. Ell s'encarregarà de la resta.
  return <NetworkLoader profiles={profiles || []} />;
}