// Ubicació: src/lib/services/marketing/marketing.service.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  Campaign,
  Strategy,
  MarketingPageData,
  
} from '@/types/comunicacio/marketing';

// Definim el tipus per al client de Supabase que rebrem
type ServerSupabaseClient = SupabaseClient<Database>;

/**
 * @summary Funció d'ajuda interna per centralitzar les crides a l'API de Gemini.
 * @private
 * @description Aquesta funció ara viu dins del servei i és privada.
 */
async function _callGeminiApi(
  prompt: string,
): Promise<{ data: string | null; error: string | null }> {
  if (!process.env.GEMINI_API_KEY) {
    return { data: null, error: "La clau de l'API de Gemini no està configurada." };
  }
  try {
    const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      console.error('Error de API de Gemini:', await response.text());
      throw new Error(`Error de API de Gemini: ${response.statusText}`);
    }

    const result = await response.json();
    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== 'string') {
      throw new Error("La resposta de l'API de Gemini no té el format esperat.");
    }

    return { data: content, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconegut';
    console.error('Error en la crida a Gemini:', message);
    return { data: null, error: message };
  }
}

/**
 * @summary Genera idees d'estratègies de màrqueting.
 * @description Conté la lògica de prompt i parsing.
 */
async function generateStrategies(
  goal: string,
): Promise<{ data: Strategy[] | null; error: string | null }> {
  const prompt = `
        Ets un director de màrqueting expert per a autònoms i PIMES.
        Un client té aquest objectiu: "${goal}".
        Proposa 3 estratègies de campanya de màrqueting diferents i creatives.
        Respon només amb un array JSON amb camps: 'name', 'type', 'target_audience', 'description'.
    `;

  const { data: rawText, error } = await _callGeminiApi(prompt);
  if (error || !rawText) {
    return { data: null, error: error || "No s'ha rebut resposta de l'IA." };
  }

  try {
    const cleanedJson = rawText.replace(/```json|```/g, '').trim();
    const strategies: Strategy[] = JSON.parse(cleanedJson);
    return { data: strategies, error: null };
  } catch (parseError) {
    console.error("Error en parsejar la resposta JSON de l'IA:", parseError);
    return { data: null, error: "La resposta de l'IA no tenia un format JSON vàlid." };
  }
}

/**
 * @summary Redacta el contingut d'una campanya.
 */
async function draftContent(
  goal: string,
  strategy: Strategy,
): Promise<{ data: string | null; error: string | null }> {
  const prompt = `Basant-te en l'objectiu "${goal}" i l'estratègia "${strategy.name}", escriu el contingut complet per a la campanya de tipus "${strategy.type}".`;
  return await _callGeminiApi(prompt);
}

/**
 * @summary Desa una nova campanya a la base de dades.
 * @description Rep el client de Supabase per injecció de dependències.
 */
async function saveCampaign(
  supabase: ServerSupabaseClient,
  activeTeamId: string,
  userId: string,
  campaignData: Partial<Campaign>,
  goal: string,
) {
  const dataToInsert = {
    user_id: userId,
    team_id: activeTeamId,
    name: campaignData.name ?? '', // Ensure string, not undefined
    type: campaignData.type ?? '', // Ensure string, not undefined
    status: 'Planificat' as const,
    campaign_date: new Date().toISOString().split('T')[0],
    goal: goal,
    target_audience: campaignData.target_audience ?? null,
    content: campaignData.content ?? null,
  };

  return await supabase.from('campaigns').insert(dataToInsert).select().single();
}

/**
 * @summary Actualitza una campanya existent.
 * @description Afegeix el 'team_id' a la consulta per seguretat RLS.
 */
async function updateCampaign(
  supabase: ServerSupabaseClient,
  campaignId: string,
  updateData: { name: string; content: string },
  activeTeamId: string, // Sempre passem el teamId per RLS
) {
  return await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', Number(campaignId))
    .eq('team_id', activeTeamId); // Assegurem la pertinença a l'equip
}

/**
 * @summary Obté totes les dades per a la pàgina de màrqueting (usat per Server Components).
 * @description Conté la lògica de crida a l'RPC i el parsing/fallback.
 */
async function getMarketingPageData(
  supabase: ServerSupabaseClient,
  activeTeamId: string,
): Promise<{ data: MarketingPageData | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_marketing_page_data', {
    p_team_id: activeTeamId,
  });

  if (error) {
    return { data: null, error: typeof error === 'string' ? error : JSON.stringify(error) };
  }

  // Assegurem que les dades són correctes abans de retornar-les
  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const typedData = isObject ? (data as MarketingPageData) : null;

  if (!typedData) {
    // Retornem un estat buit si l'RPC no retorna el format esperat
    const fallbackData: MarketingPageData = {
      kpis: { totalLeads: 0, conversionRate: 0 },
      campaigns: [],
    };
    return { data: fallbackData, error: null };
  }

  return { data: typedData, error: null };
}

// Exportem un objecte 'marketingService' que agrupa totes les funcions
export const marketingService = {
  generateStrategies,
  draftContent,
  saveCampaign,
  updateCampaign,
  getMarketingPageData,
};