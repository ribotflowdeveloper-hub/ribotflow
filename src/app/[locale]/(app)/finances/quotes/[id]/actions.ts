// /app/[locale]/(app)/crm/quotes/[id]/actions.ts (CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';
import type { ActionResult } from '@/types/shared/index';

// Definim els tipus directament des de la base de dades.
type Quote = Database['public']['Tables']['quotes']['Row'];
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

// ✅ 1. Definim el tipus del payload que espera la funció.
// Aquest tipus coincideix amb el que envia el hook, on 'id' pot ser 'new' o 'number'.
type QuotePayload = Partial<Omit<Quote, 'id'>> & { 
    id: 'new' | number;
    items: Partial<QuoteItem>[];
};

/**
 * Desa (crea o actualitza) un pressupost i els seus conceptes.
 */
export async function saveQuoteAction(quoteData: QuotePayload): Promise<ActionResult<number>> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    if (!quoteData.contact_id) return { success: false, message: "Si us plau, selecciona un client." };

    try {
        // La funció RPC 'upsert_quote_with_items' ja està dissenyada per rebre un 'id' que pot ser 'new'.
        const { data, error } = await supabase.rpc('upsert_quote_with_items', {
            quote_payload: quoteData as QuotePayload // Utilitzem el tipus específic per garantir la seguretat de tipus
        });

        if (error) {
            console.error("Supabase RPC Error:", JSON.stringify(error, null, 2));
            throw error;
        }
        
        const finalQuoteId = (data as { quote_id: number }).quote_id;

        revalidatePath('/crm/quotes');
        revalidatePath(`/crm/quotes/${finalQuoteId}`);
        
        return { success: true, message: "Pressupost desat correctament.", data: finalQuoteId };

    } catch(error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut al desar el pressupost.";
        console.error("Error a saveQuoteAction:", message);
        return { success: false, message };
    }
}

// Les altres accions es mantenen igual, ja que esperen IDs numèrics,
// i el hook s'encarregarà de cridar-les només quan sigui apropiat.

export async function deleteQuoteAction(quoteId: number): Promise<ActionResult> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase } = session;

    try {
        await supabase.from('quote_items').delete().eq('quote_id', quoteId);
        await supabase.from('quotes').delete().eq('id', quoteId);
        revalidatePath('/finances/quotes');
        return { success: true, message: "Pressupost eliminat." };
    } catch(error) {
        const message = error instanceof Error ? error.message : "Error en eliminar el pressupost.";
        return { success: false, message };
    }
}

export async function createProductAction(newProduct: { name: string, price: number }): Promise<ActionResult<Product>> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    try {
        const { data, error } = await supabase.from('products').insert({
            user_id: user.id, team_id: activeTeamId,
            name: newProduct.name, price: newProduct.price,
        }).select().single();

        if (error) throw error;
        revalidatePath(`/finances/quotes`, 'layout');
        return { success: true, message: 'Nou producte desat.', data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en crear el producte.";
        return { success: false, message };
    }
}

export async function sendQuoteAction(quoteId: number): Promise<ActionResult> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase } = session;
    
    try {
        const { error } = await supabase.functions.invoke('send-quote-pdf', { body: { quoteId } });
        if (error) throw error;
        revalidatePath(`/finances/quotes/${quoteId}`);
        return { success: true, message: "S'ha iniciat l'enviament del pressupost." };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en invocar l'Edge Function.";
        return { success: false, message };
    }
}

export async function updateTeamProfileAction(teamData: Partial<Team>): Promise<ActionResult<Team>> {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, activeTeamId } = session;

    try {
        const { data, error } = await supabase
            .from('teams')
            .update(teamData)
            .eq('id', activeTeamId)
            .select()
            .single();
            
        if (error) throw error;
        
        revalidatePath(`/finances/quotes/[id]`, 'page');
        return { success: true, message: 'Perfil de l\'equip actualitzat.', data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error en actualitzar el perfil.";
        return { success: false, message };
    }
}