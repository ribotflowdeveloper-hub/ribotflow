// src/app/(app)/settings/blacklist/page.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BlacklistClient } from './_components/BlacklistClient'; // Importem el teu component de client
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Filtre Inbox (Blacklist) | Ribot',
};

// Definim el tipus per a les regles
export type Rule = {
  id: string;
  value: string;
  rule_type: 'email' | 'domain';
};

// Aquesta és la pàgina del servidor
export default async function BlacklistPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtenim les regles de la blacklist per a l'usuari actual
  const { data: rules, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist:", error);
    // Podríem mostrar un error aquí
  }

  return <BlacklistClient initialRules={rules || []} />;
}