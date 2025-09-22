import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BlacklistClient } from './BlacklistClient';
import type { Rule } from '../page';

/**
 * @summary Server Component asíncron que carrega les regles de la blacklist.
 */
export async function BlacklistData() {
  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: rules, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist:", error);
  }

  return <BlacklistClient initialRules={(rules as Rule[]) || []} />;
}