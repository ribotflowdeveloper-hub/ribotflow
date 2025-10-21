import { getTranslations } from 'next-intl/server';
import { BlacklistClient } from './BlacklistClient';
import { validatePageSession } from '@/lib/supabase/session';
import type { BlacklistRule } from '@/types/settings';
import type { Role } from '@/lib/permissions.config';

interface BlacklistDataProps {
  currentUserRole: Role | null;
}

export async function BlacklistData({ currentUserRole }: BlacklistDataProps) {
  const t = await getTranslations('SettingsPage.blacklist');
  const { supabase } = await validatePageSession();

  const { data: rulesFromDb, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist:", error.message);
  }

  // ✅ CORRECCIÓ DEFINITIVA: Filtrem i després transformem.
  const formattedRules: BlacklistRule[] = (rulesFromDb || [])
    // 1. Filtrem per descartar les regles que tenen 'team_id' com a null,
    //    ja que el tipus 'BlacklistRule' requereix un string.
    .filter(rule => !!rule.team_id) 
    // 2. Transformem les regles restants al format correcte.
    .map(rule => ({
      ...rule,
      id: String(rule.id), // Convertim id: number -> string
      team_id: rule.team_id as string, // Ara podem assegurar que team_id és un string
      rule_type: rule.rule_type as 'domain' | 'email', // Assegurem el tipus per a més seguretat
    }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">{t('pageDescription')}</p>
      <BlacklistClient 
        initialRules={formattedRules} 
        currentUserRole={currentUserRole}
      />
    </div>
  );
}