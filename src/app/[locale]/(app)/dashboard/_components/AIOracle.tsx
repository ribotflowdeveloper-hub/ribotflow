import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'

/**
 * @summary Component de servidor aïllat que carrega i mostra les dades de la IA.
 */
export async function AIOracle() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: aiInsights, error } = await supabase.functions.invoke('generate-ai-summary');

    if (error) throw error; // L'error serà capturat per un Error Boundary

    const summary = aiInsights?.summary || 'No s’ha pogut carregar el resum.';
    const suggestion = aiInsights?.suggestion || 'Intenta-ho de nou més tard.';

    return (
      <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-gradient-to-br from-white/10 to-white/5">
        <h2 className="text-xl font-bold text-white mb-3">Oracle d’IA</h2>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white/90 mb-1">Resum</p>
            <p className="text-sm text-white/80">{summary}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white/90 mb-1">Suggeriment</p>
            <p className="text-sm text-white/80">{suggestion}</p>
          </div>
          <Button variant="outline" className="w-full">Parlar amb l’assistent</Button>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al invocar la funció de IA:", error);
    const errorMessage = "No s'ha pogut contactar amb l'Oracle de IA.";
    return (
      <div className="rounded-2xl p-6 ring-1 ring-red-500/30 bg-gradient-to-br from-red-900/20 to-red-800/10">
        <h2 className="text-xl font-bold text-white mb-3">Oracle d’IA</h2>
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-sm font-semibold text-red-300 mb-1">Error</p>
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      </div>
    );
  }
}