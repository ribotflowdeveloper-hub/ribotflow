// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import type { Quote, CompanyProfile } from './page';
import { withUser } from "@/lib/actions";

// --- ACCIONS DE PRESSUPOSTOS ---

export async function saveQuoteAction(quoteData: Quote) {
  return withUser(async (supabase, userId) => {
    if (!quoteData.contact_id) return { success: false, message: "Si us plau, selecciona un client." };

    const { items, id, ...quoteFields } = quoteData;
    let finalQuoteId = id;

    if (id === 'new') {
      const { data: newQuote, error } = await supabase.from('quotes').insert({ ...quoteFields, user_id: userId }).select('id').single();
      if (error || !newQuote) throw error || new Error("No s'ha pogut crear el pressupost.");
      finalQuoteId = newQuote.id;
    } else {
      await supabase.from('quotes').update(quoteFields).eq('id', id);
      await supabase.from('quote_items').delete().eq('quote_id', id);
    }

    if (items?.length) {
      const itemsToInsert = items.map(item => ({
        quote_id: finalQuoteId, user_id: userId, product_id: item.product_id || null, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, total: (item.quantity || 0) * (item.unit_price || 0),
      }));
      await supabase.from('quote_items').insert(itemsToInsert);
    }

    if (quoteFields.opportunity_id) {
      await supabase.from('opportunities').update({ stage_name: 'Proposta Enviada' }).eq('id', quoteFields.opportunity_id);
    }

    return { success: true, message: "Pressupost desat correctament.", data: finalQuoteId };
  }, [`/crm/quotes`, `/crm/quotes/${quoteData.id}`]);
}


export async function deleteQuoteAction(quoteId: string) {
  if (!quoteId || quoteId === 'new') return { success: false, message: "ID de pressupost invàlid." };

  return withUser(async (supabase, userId) => {
    await supabase.from('quote_items').delete().eq('quote_id', quoteId).eq('user_id', userId);
    await supabase.from('quotes').delete().eq('id', quoteId).eq('user_id', userId);
    return { success: true, message: "Pressupost eliminat." };
  }, ['/crm/quotes']);
}


export async function sendQuoteAction(quoteId: string) {
  if (!quoteId) return { success: false, message: "ID de pressupost invàlid." };
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no autenticat." };

  try {
    // La pujada del PDF es fa al client. Aquesta acció només invoca la funció.
    const { error: functionError } = await supabase.functions.invoke('send-quote-pdf', { body: { quoteId } });
    if (functionError) throw functionError;
    
    // ❌ ELIMINAT: Aquesta línia la gestiona ara la Edge Function.
    // await supabase.from('quotes').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', quoteId);

    revalidatePath(`/crm/quotes/${quoteId}`);
    return { success: true, message: "S'ha iniciat l'enviament del pressupost." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

// --- ACCIONS DE SUB-COMPONENTS ---

export async function updateCompanyProfileAction(profileData: CompanyProfile) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileData) return { success: false, message: "Dades invàlides." };

    try {
        const { data, error } = await supabase.from('profiles').upsert({ ...profileData, id: user.id }).select().single();
        if (error) throw error;
        
        revalidatePath(`/crm/quotes/[id]`, 'layout');
        return { success: true, message: 'Perfil d\'empresa actualitzat.', updatedProfile: data };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
      }
}

export async function createProductAction(newProduct: { name: string, price: number }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    try {
        const { data, error } = await supabase.from('products').insert({
            user_id: user.id, name: newProduct.name, price: newProduct.price,
        }).select().single();

        if (error) throw error;

        revalidatePath(`/crm/quotes/[id]`, 'page');
        return { success: true, message: 'Nou producte desat.', newProduct: data };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
      }
}

