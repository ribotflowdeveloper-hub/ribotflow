import { getTranslations } from 'next-intl/server';
import { BlacklistClient } from './BlacklistClient';
import { validatePageSession } from '@/lib/supabase/session';
import type { BlacklistRule } from '@/types/settings';

interface BlacklistDataProps {
  currentUserRole: string | null;
}

/**
 * Aquest Server Component obté les dades de la blacklist i les passa
 * al Client Component que gestionarà la interactivitat.
 */
export async function BlacklistData({ currentUserRole }: BlacklistDataProps) {
  const t = await getTranslations('SettingsPage.blacklist');
  
  // ✅ REFACTORITZACIÓ: Utilitzem el nostre helper per simplificar la validació.
  const { supabase } = await validatePageSession();

  // La consulta és simple perquè la seguretat (filtrar per equip actiu)
  // es delega a les Polítiques de Row Level Security (RLS) de Supabase.
  const { data: rules, error } = await supabase
    .from('blacklist_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar les regles de la blacklist:", error.message);
    // Podríem mostrar un missatge d'error aquí si fos necessari.
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
