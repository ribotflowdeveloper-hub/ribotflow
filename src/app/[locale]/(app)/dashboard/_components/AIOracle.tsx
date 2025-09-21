/**
 * @file AIOracle.tsx
 * @summary Component de servidor aïllat que carrega i mostra les dades de la IA,
 * ara amb disseny adaptable i traduccions.
 */
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server'; // ✅ Importem la funció de traducció del servidor

export async function AIOracle() {
  // ✅ Obtenim les traduccions per a aquest component
  const t = await getTranslations('DashboardClient.aiOracle');
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const { data: aiInsights, error } = await supabase.functions.invoke('generate-ai-summary');

    if (error) throw error;

    const summary = aiInsights?.summary || t('noSummary');
    const suggestion = aiInsights?.suggestion || t('noSuggestion');

    return (
      // ✅ CORRECCIÓ: Usem 'bg-card' i 'ring-border' per adaptar-se al tema.
      <div className="rounded-2xl p-6 ring-1 ring-border bg-card">
        <h2 className="text-xl font-bold text-foreground mb-3">{t('title')}</h2>
        <div className="space-y-3">
          {/* ✅ CORRECCIÓ: Usem 'bg-muted' i colors de text semàntics. */}
          <div className="p-3 rounded-lg bg-muted ring-1 ring-border">
            <p className="text-sm font-semibold text-foreground mb-1">{t('summary')}</p>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted ring-1 ring-border">
            <p className="text-sm font-semibold text-foreground mb-1">{t('suggestion')}</p>
            <p className="text-sm text-muted-foreground">{suggestion}</p>
          </div>
          <Button variant="outline" className="w-full">{t('button')}</Button>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al invocar la funció de IA:", error);
    
    return (
      // ✅ CORRECCIÓ: Usem colors de 'destructive' per a l'estat d'error.
      <div className="rounded-2xl p-6 ring-1 ring-destructive/30 bg-destructive/10">
        <h2 className="text-xl font-bold text-destructive-foreground mb-3">{t('title')}</h2>
        <div className="p-3 rounded-lg bg-destructive/10">
          <p className="text-sm font-semibold text-destructive-foreground mb-1">{t('errorTitle')}</p>
          <p className="text-sm text-destructive-foreground/80">{t('loadError')}</p>
        </div>
      </div>
    );
  }
}