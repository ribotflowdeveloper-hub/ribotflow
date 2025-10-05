// Ubicació: /app/(app)/comunicacio/marketing/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ Importem el nostre helper!
import type { Campaign } from '../page';

// ... (El teu tipus 'Strategy' es manté igual) ...
interface Strategy {
    name: string;
    type: string;
    target_audience: string;
    description: string;
}

/**
 * @summary Funció d'ajuda interna per centralitzar les crides a l'API de Gemini.
 * @private
 */
async function _callGeminiApi(prompt: string): Promise<{ data: string | null, error: string | null }> {
    if (!process.env.GEMINI_API_KEY) {
        return { data: null, error: "La clau de l'API de Gemini no està configurada." };
    }
    try {
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Error de l'API de Gemini:", await response.text());
            throw new Error(`Error de l'API de Gemini: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Assegurem que la resposta té el format esperat abans d'accedir-hi
        const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof content !== 'string') {
            throw new Error("La resposta de l'API de Gemini no té el format esperat.");
        }

        return { data: content, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconegut';
        console.error("Error en la crida a Gemini:", message);
        return { data: null, error: message };
    }
}

/**
 * @summary Genera idees d'estratègies de màrqueting. Ara és molt més simple.
 */
export async function generateStrategiesAction(goal: string): Promise<{ data: Strategy[] | null, error: string | null }> {
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
        // ✅ CORRECCIÓ: Netejem la resposta de l'IA abans de parsejar-la.
        const cleanedJson = rawText.replace(/```json|```/g, '').trim();
        const strategies: Strategy[] = JSON.parse(cleanedJson);
        return { data: strategies, error: null };
    } catch (parseError) {
        console.error("Error en parsejar la resposta JSON de l'IA:", parseError);
        return { data: null, error: "La resposta de l'IA no tenia un format JSON vàlid." };
    }
}

/**
 * @summary Redacta el contingut d'una campanya. Ara també utilitza el helper.
 */
export async function draftContentAction(goal: string, strategy: Strategy): Promise<{ data: string | null, error: string | null }> {
    const prompt = `Basant-te en l'objectiu "${goal}" i l'estratègia "${strategy.name}", escriu el contingut complet per a la campanya de tipus "${strategy.type}".`;
    
    // La crida retorna directament el que necessitem
    return await _callGeminiApi(prompt);
}


/**
 * @summary Desa una nova campanya, ara utilitzant el helper de sessió.
 */
export async function saveCampaignAction(campaignData: Partial<Campaign>, goal: string) {
    // ✅ Utilitzem el helper per validar la sessió i obtenir les dades.
    const sessionResult = await validateUserSession();
    if ('error' in sessionResult) {
        return { data: null, error: sessionResult.error };
    }
    const { supabase, user, activeTeamId } = sessionResult;

    const dataToInsert = {
        user_id: user.id,
        team_id: activeTeamId,
        name: campaignData.name,
        type: campaignData.type,
        status: 'Planificat' as const, // Assegurem el tipus
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

// updateCampaignAction es manté pràcticament igual, ja és prou simple.
export async function updateCampaignAction(campaignId: string, name: string, content: string) {
    const sessionResult = await validateUserSession();
     if ('error' in sessionResult) {
        return { data: null, error: sessionResult.error };
    }
    const { supabase } = sessionResult;

    const { error } = await supabase
        .from('campaigns')
        .update({ name, content })
        .eq('id', campaignId);
        
    revalidatePath('/comunicacio/marketing');
    return { error };
}