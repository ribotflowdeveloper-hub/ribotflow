import { getTranslations } from 'next-intl/server';
import { BlacklistClient } from './BlacklistClient';
import { validatePageSession } from '@/lib/supabase/session';
import type { BlacklistRule } from '@/types/settings';
import type { Role } from '@/lib/permissions.config'; // Importa Role

interface BlacklistDataProps {
  currentUserRole: Role | null; // Fes servir el tipus Role
}

export async function BlacklistData({ currentUserRole }: BlacklistDataProps) {
  const t = await getTranslations('SettingsPage.blacklist');
  const { supabase } = await validatePageSession();

  const { data: rules, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist:", error.message);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">{t('pageDescription')}</p>
      <BlacklistClient 
        initialRules={(rules as BlacklistRule[]) || []} 
        currentUserRole={currentUserRole}
      />
    </div>
  );
}