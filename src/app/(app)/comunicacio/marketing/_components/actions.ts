"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Campaign } from '../page';

interface Strategy {
    name: string;
    type: string;
    target_audience: string;
    description: string;
}

export async function generateStrategiesAction(goal: string): Promise<{ data: Strategy[] | null, error: string | null }> {
  if (!process.env.GEMINI_API_KEY) {
      return { data: null, error: "La clau de l'API de Gemini no està configurada." };
  }
  try {
      const prompt = `
          Ets un director de màrqueting expert per a autònoms i PIMES.
          Un client té aquest objectiu: "${goal}".
          Proposa 3 estratègies de campanya de màrqueting diferents i creatives.
          Respon només amb un array JSON amb camps: 'name', 'type', 'target_audience', 'description'.
      `;

      const payload = { 
          contents: [{ role: "user", parts: [{ text: prompt }] }] 
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
      });

      if (!response.ok) throw new Error('Error de l\'API de Gemini');
      const result = await response.json();
      const strategies: Strategy[] = JSON.parse(result.candidates[0].content.parts[0].text);
      return { data: strategies, error: null };
  } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconegut';
      return { data: null, error: message };
  }
}

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
        return { data: null, error: message };
    }
}

export async function saveCampaignAction(campaignData: Partial<Campaign>, goal: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } };

  const { data, error } = await supabase.from('campaigns').insert({
    user_id: user.id,
    name: campaignData.name,
    type: campaignData.type,
    status: 'Planificat',
    campaign_date: new Date().toISOString().split('T')[0],
    goal: goal,
    target_audience: campaignData.target_audience,
    content: campaignData.content,
  }).select().single();

  revalidatePath('/comunicacio/marketing');
  return { data, error };
}

export async function updateCampaignAction(campaignId: string, name: string, content: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from('campaigns').update({ name, content }).eq('id', campaignId);
  revalidatePath('/comunicacio/marketing');
  return { error };
}
