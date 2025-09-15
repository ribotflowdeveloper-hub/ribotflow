// Aquest arxiu és un Server Component. La seva única funció és
// carregar les dades inicials de forma segura des del servidor.

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BlacklistClient } from './_components/BlacklistClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Filtre Inbox (Blacklist) | Ribot',
};

// Definim el tipus de dades per a les regles.
export type Rule = {
  id: string;
  value: string;
  rule_type: 'email' | 'domain';
};

/**
 * Funció principal de la pàgina del servidor.
 * Autentica l'usuari, carrega les regles de la seva blacklist i les passa
 * al component de client per a la seva visualització i gestió.
 */
export default async function BlacklistPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificació d'autenticació.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Càrrega de dades: obtenim totes les regles de l'usuari actual.
  const { data: rules, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist:", error);
  }

  // Passem les dades carregades al component de client.
  return <BlacklistClient initialRules={rules || []} />;
}