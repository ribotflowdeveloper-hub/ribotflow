"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type Campaign } from '../page';

// Acció per generar estratègies amb la API de Gemini
export async function generateStrategiesAction(goal: string): Promise<{ data: any | null, error: string | null }> {
  if (!process.env.GEMINI_API_KEY) {
      return { data: null, error: "La clau de l'API de Gemini no està configurada." };
  }
  try {
      // ✅ PROMPT MILLORAT I MÉS PRECÍS ✅
      const prompt = `
          Ets un director de màrqueting expert per a autònoms i PIMES.
          Un client té aquest objectiu: "${goal}".

          Proposa 3 estratègies de campanya de màrqueting diferents i creatives per assolir aquest objectiu.
          Per a cada estratègia, defineix els següents camps: 'name', 'type', 'target_audience', i 'description'.

          Instruccions importants:
          1.  Respon en català.
          2.  El 'name' ha de ser un títol atractiu i curt.
          3.  El 'type' ha de ser una d'aquestes opcions: "Email", "Social", "Blog".
          4.  La 'description' ha de ser un paràgraf concís (2-3 frases) que expliqui l'enfocament.
          5.  La teva resposta ha de ser ÚNICAMENT l'array JSON, sense text addicional, explicacions o format markdown.
      `;

      const payload = { 
          contents: [{ role: "user", parts: [{ text: prompt }] }], 
          generationConfig: { 
              responseMimeType: "application/json", 
              responseSchema: { 
                  type: "ARRAY", 
                  items: { 
                      type: "OBJECT", 
                      properties: { 
                          name: { type: "STRING" }, 
                          type: { type: "STRING" }, 
                          target_audience: { type: "STRING" }, 
                          description: { type: "STRING" } 
                      } 
                  } 
              } 
          } 
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
      });

      if (!response.ok) {
           const errorBody = await response.json();
           console.error("Gemini API Error:", errorBody);
           throw new Error(`Error de l'API de Gemini: ${errorBody.error?.message || 'Resposta no vàlida'}`);
      }
      const result = await response.json();
      const strategies = JSON.parse(result.candidates[0].content.parts[0].text);
      return { data: strategies, error: null };
  } catch (error: any) {
      console.error(error);
      return { data: null, error: error.message };
  }
}

// Acción para generar el contenido de una campaña
export async function draftContentAction(goal: string, strategy: any): Promise<{ data: string | null, error: string | null }> {
    if (!process.env.GEMINI_API_KEY) {
        return { data: null, error: "La clau de l'API de Gemini no està configurada." };
    }
     try {
        const prompt = `Basant-te en l'objectiu "${goal}" i l'estratègia de campanya anomenada "${strategy.name}" per a un públic "${strategy.target_audience}", escriu el contingut complet per a aquesta campanya de tipus "${strategy.type}". El text ha de ser persuasiu, professional i estar a punt per ser publicat.`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (!response.ok) throw new Error('Error de l\'API de Gemini');
        const result = await response.json();
        const content = result.candidates[0].content.parts[0].text;
        return { data: content, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}


// Acción para guardar la campaña en Supabase
export async function saveCampaignAction(
  campaignData: Partial<Campaign>,
  goal: string
): Promise<{ data: Campaign | null, error: any }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } };

  const dataToSave = {
    user_id: user.id,
    name: campaignData.name,
    type: campaignData.type,
    status: 'Planificat',
    campaign_date: new Date().toISOString().split('T')[0],
    goal: goal,
    target_audience: campaignData.target_audience,
    content: campaignData.content,
  };

  const { data, error } = await supabase.from('campaigns').insert(dataToSave).select().single();

  if (error) {
    console.error("Error saving campaign:", error);
  }
  
  revalidatePath('/comunicacio/marketing');
  return { data, error };
}

// Acción para actualizar una campaña
export async function updateCampaignAction(
  campaignId: string,
  name: string,
  content: string
): Promise<{ error: any }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from('campaigns').update({ name, content }).eq('id', campaignId);
    if(error) console.error("Error updating campaign:", error);
    revalidatePath('/comunicacio/marketing');
    return { error };
}