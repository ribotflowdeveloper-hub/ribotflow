/**
 * @file actions.ts (Marketing)
 * @summary Aquest fitxer conté totes les Server Actions per al mòdul de campanyes de màrqueting.
 * Inclou la interacció amb l'API de Gemini per a la generació de contingut i la gestió
 * de les campanyes a la base de dades de Supabase.
 */

"use server"; // Totes les funcions d'aquest fitxer s'executen al servidor.

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Campaign } from '../page'; // Tipus de dades per a una campanya.

// Interfície per al tipat de les estratègies que retorna l'IA.
interface Strategy {
    name: string;
    type: string;
    target_audience: string;
    description: string;
}

/**
 * @summary Crida a l'API de Gemini per generar idees d'estratègies de màrqueting.
 * @param {string} goal - L'objectiu de màrqueting que l'usuari ha introduït.
 * @returns {Promise<{ data: Strategy[] | null, error: string | null }>} Un objecte amb les estratègies o un missatge d'error.
 */
export async function generateStrategiesAction(goal: string): Promise<{ data: Strategy[] | null, error: string | null }> {
  // Comprovació de seguretat: assegurem que la clau de l'API estigui configurada als secrets del servidor.
  if (!process.env.GEMINI_API_KEY) {
      return { data: null, error: "La clau de l'API de Gemini no està configurada." };
  }
  try {
      // El 'prompt' és la instrucció que li donem al model d'IA.
      // Està dissenyat per ser molt específic ("Ets un director de màrqueting...") per obtenir millors resultats.
      // Li demanem que respongui obligatòriament en format JSON per poder processar la resposta fàcilment.
      const prompt = `
          Ets un director de màrqueting expert per a autònoms i PIMES.
          Un client té aquest objectiu: "${goal}".
          Proposa 3 estratègies de campanya de màrqueting diferents i creatives.
          Respon només amb un array JSON amb camps: 'name', 'type', 'target_audience', 'description'.
      `;

      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

      // Fem la petició a l'endpoint de l'API de Gemini.
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
      });

      if (!response.ok) throw new Error('Error de l\'API de Gemini');
      const result = await response.json();
      // Extraiem el text de la resposta i el convertim de JSON (string) a un objecte JavaScript.
      const strategies: Strategy[] = JSON.parse(result.candidates[0].content.parts[0].text);
      return { data: strategies, error: null };
  } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconegut';
      console.error("Error en generar estratègies:", message);
      return { data: null, error: message };
  }
}

/**
 * @summary Crida a l'API de Gemini per redactar el contingut d'una campanya.
 * @param {string} goal - L'objectiu general de la campanya.
 * @param {Strategy} strategy - L'estratègia específica seleccionada per l'usuari.
 * @returns {Promise<{ data: string | null, error: string | null }>} Un objecte amb el contingut redactat o un error.
 */
export async function draftContentAction(goal: string, strategy: Strategy): Promise<{ data: string | null, error: string | null }> {
    if (!process.env.GEMINI_API_KEY) {
        return { data: null, error: "La clau de l'API de Gemini no està configurada." };
    }
    try {
        const prompt = `Basant-te en l'objectiu "${goal}" i l'estratègia "${strategy.name}" escriu el contingut complet per a la campanya de tipus "${strategy.type}".`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
        });
        if (!response.ok) throw new Error('Error de l\'API de Gemini');
        const result = await response.json();
        const content: string = result.candidates[0].content.parts[0].text;
        return { data: content, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconegut';
        console.error("Error en redactar el contingut:", message);
        return { data: null, error: message };
    }
}

/**
 * @summary Desa una nova campanya de màrqueting a la base de dades.
 * @param {Partial<Campaign>} campaignData - Les dades de la campanya a desar.
 * @param {string} goal - L'objectiu associat a la campanya.
 * @returns {Promise<{ data: any, error: any }>} El resultat de la inserció a Supabase.
 */

export async function saveCampaignAction(campaignData: Partial<Campaign>, goal: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    // Obtenim l'equip actiu del token
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { data: null, error: { message: "No s'ha pogut determinar l'equip actiu." } };
    }

    const dataToInsert = {
        user_id: user.id,
        team_id: activeTeamId, // ✅ Assignem l'equip actiu
        name: campaignData.name,
        type: campaignData.type,
        status: 'Planificat',
        campaign_date: new Date().toISOString().split('T')[0],
        goal: goal,
        target_audience: campaignData.target_audience,
        content: campaignData.content,
    };

    const { data, error } = await supabase
        .from('campaigns')
        .insert(dataToInsert)
        .select()
        .single();

    revalidatePath('/comunicacio/marketing');
    return { data, error };
}

/**
 * Actualitza una campanya existent. La RLS s'encarregarà de la seguretat.
 */
export async function updateCampaignAction(campaignId: string, name: string, content: string) {
    const supabase = createClient(cookies());
    // La política RLS de la base de dades s'encarregarà de verificar que només
    // podem editar una campanya del nostre equip actiu.
    const { error } = await supabase
        .from('campaigns')
        .update({ name, content })
        .eq('id', campaignId);
        
    revalidatePath('/comunicacio/marketing');
    return { error };
}