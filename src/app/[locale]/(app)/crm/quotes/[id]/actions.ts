"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import type { Quote, CompanyProfileObject } from '@/types/crm';
// 'withUser' és una funció 'wrapper' personalitzada que probablement gestiona l'autenticació
// i la creació del client de Supabase per evitar repetir codi a cada acció.
import { withUser } from "@/lib/actions";

// --- ACCIONS DE PRESSUPOSTOS ---

/**
 * Server Action per desar (crear o actualitzar) un pressupost i els seus conceptes.
 * @param quoteData L'objecte complet del pressupost enviat des del client.
 */
export async function saveQuoteAction(quoteData: Quote) {
  // Utilitzem el 'wrapper' withUser per gestionar l'autenticació i la revalidació de rutes.
  return withUser(async (supabase, userId) => {
    // Validació bàsica: assegurem que el pressupost tingui un client associat.
    if (!quoteData.contact_id) return { success: false, message: "Si us plau, selecciona un client." };

    // Separem els conceptes ('items') de la resta de dades del pressupost.
    const { items, id, ...quoteFields } = quoteData;
    let finalQuoteId = id; // Guardem l'ID del pressupost per a ús posterior.

    // Si l'ID és 'new', estem creant un nou pressupost.
    if (id === 'new') {
      const { data: newQuote, error } = await supabase.from('quotes').insert({ ...quoteFields, user_id: userId }).select('id').single();
      if (error || !newQuote) throw error || new Error("No s'ha pogut crear el pressupost.");
      finalQuoteId = newQuote.id; // Obtenim l'ID del nou pressupost creat.
    } else { // Si ja té un ID, estem actualitzant un pressupost existent.
      await supabase.from('quotes').update(quoteFields).eq('id', id);
      // Per simplicitat, esborrem tots els conceptes antics abans d'inserir els nous.
      await supabase.from('quote_items').delete().eq('quote_id', id);
    }

    // Si hi ha conceptes a la llista, els inserim a la taula 'quote_items'.
    if (items?.length) {
      const itemsToInsert = items.map(item => ({
        quote_id: finalQuoteId, // Associem cada concepte amb l'ID del pressupost.
        user_id: userId,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: (item.quantity || 0) * (item.unit_price || 0),
      }));
      await supabase.from('quote_items').insert(itemsToInsert);
    }

    // Si el pressupost està associat a una oportunitat, actualitzem l'estat d'aquesta.
    if (quoteFields.opportunity_id) {
      await supabase.from('opportunities').update({ stage_name: 'Proposta Enviada' }).eq('id', quoteFields.opportunity_id);
    }

    // Retornem un missatge d'èxit i el nou ID si s'ha creat un pressupost nou.
    return { success: true, message: "Pressupost desat correctament.", data: finalQuoteId };
  }, [`/crm/quotes`, `/crm/quotes/${quoteData.id}`]); // Rutes a revalidar en cas d'èxit.
}


/**
 * Server Action per eliminar un pressupost i tots els seus conceptes associats.
 * @param quoteId L'ID del pressupost a eliminar.
 */
export async function deleteQuoteAction(quoteId: string) {
  if (!quoteId || quoteId === 'new') return { success: false, message: "ID de pressupost invàlid." };

  return withUser(async (supabase, userId) => {
    // Important: primer eliminem els conceptes (taula filla) i després el pressupost (taula pare)
    // per evitar errors de clau forana si no hi ha 'ON DELETE CASCADE' a la base de dades.
    await supabase.from('quote_items').delete().eq('quote_id', quoteId).eq('user_id', userId);
    await supabase.from('quotes').delete().eq('id', quoteId).eq('user_id', userId);
    return { success: true, message: "Pressupost eliminat." };
  }, ['/crm/quotes']);
}


/**
 * Server Action per iniciar el procés d'enviament d'un pressupost en PDF.
 * Aquesta acció fa de pont segur cap a una Edge Function que s'encarrega de la feina pesada.
 * @param quoteId L'ID del pressupost a enviar.
 */
export async function sendQuoteAction(quoteId: string) {
  if (!quoteId) return { success: false, message: "ID de pressupost invàlid." };
  

  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no autenticat." };

  try {
    // La pujada del PDF es fa al client. Aquesta acció només crida la funció
    // 'send-quote-pdf' que s'encarregarà d'enviar el correu des del servidor.
    const { error: functionError } = await supabase.functions.invoke('send-quote-pdf', { body: { quoteId } });
    if (functionError) throw functionError;
    
    revalidatePath(`/crm/quotes/${quoteId}`);
    return { success: true, message: "S'ha iniciat l'enviament del pressupost." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

// --- ACCIONS DE SUB-COMPONENTS ---
/**
 * Acció per actualitzar el perfil de l'empresa de l'usuari.
 */
export async function updateCompanyProfileAction(profileData: CompanyProfileObject) {
  
  const supabase = createClient(cookies())
;
  const { data: { user } } = await supabase.auth.getUser();
  
  // ✅ Assegurem que profileData no sigui null
  if (!user || !profileData) {
      return { success: false, message: "Dades invàlides." };
  }

  try {
      const { data, error } = await supabase
          .from('profiles')
          .upsert({ ...profileData, id: user.id })
          .select()
          .single();
      
      if (error) throw error;
      
      // ✅ CORRECCIÓ DEFINITIVA: Revalidem el layout del CRM.
      // Això refrescarà les dades a totes les pàgines dins de /crm,
      // incloent-hi la pàgina de l'editor de pressupostos, de manera segura.
      revalidatePath('/crm', 'layout');
      
      return { success: true, message: 'Perfil d\'empresa actualitzat.', updatedProfile: data };
  } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconegut";
      return { success: false, message };
  }
}
/**
 * Acció per crear un nou producte desable des de l'editor de pressupostos.
 */
export async function createProductAction(newProduct: { name: string, price: number }) {
   
    const supabase = createClient(cookies())
;
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

