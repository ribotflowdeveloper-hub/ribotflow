// src/lib/services/public-quote.service.ts (FITXER NOU I COMPLET)
"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { z } from 'zod';
import type { QuoteDataFromServer } from '@/types/finances';
import { type Database } from '@/types/supabase';

// --- Tipus de Retorn ---
export type FormState = { success: boolean; message: string; };

// --- Esquemes de Validació (Moguts des de 'actions.ts') ---
const AcceptQuoteSchema = z.string().uuid("L'identificador del pressupost és invàlid.");
const RejectQuoteSchema = z.object({
  secureId: z.string().uuid("L'identificador del pressupost és invàlid."),
  reason: z.string().min(10, "El motiu del rebuig ha de tenir almenys 10 caràcters.").max(500, "El motiu és massa llarg."),
});

// Tipus interns per a la consulta
type QuoteWithRelations = Database['public']['Tables']['quotes']['Row'] & {
  contacts: Database['public']['Tables']['contacts']['Row'] | null;
  team: Database['public']['Tables']['teams']['Row'] | null;
};

// ---
// ⚙️ FUNCIÓ DE LECTURA (Lògica de 'getQuoteDataBySecureId')
// ---
export async function getPublicQuoteData(secureId: string): Promise<QuoteDataFromServer | null> {
  // Aquesta pàgina és pública, per tant fem servir Admin per bypassar RLS
  const supabaseAdmin = createAdminClient();

  const { data: quoteData, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("*, contacts (*), team:teams (*)")
    .eq("secure_id", secureId)
    .single<QuoteWithRelations>();

  if (quoteError || !quoteData) {
    console.error("Error carregant dades del pressupost (Pas 1):", quoteError?.message || "Dades no trobades");
    return null;
  }
  
  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteData.id);

  if (itemsError) {
    console.error("Pressupost trobat, però error en carregar items (Pas 2):", itemsError.message);
  }

  // Combinem les dades i solucionem el 'type casting'
  const fullData = {
    ...quoteData,
    items: itemsData || [] 
  };

  return fullData as unknown as QuoteDataFromServer; // Aquest 'unknown' és necessari per la diferència de tipus
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (Lògica de 'actions.ts')
// ---

export async function acceptQuote(secureId: string): Promise<FormState> {
  const validation = AcceptQuoteSchema.safeParse(secureId);
  if (!validation.success) {
    return { success: false, message: validation.error.issues[0].message };
  }

  const supabaseAdmin = createAdminClient();

  try {
    // ✅ CRIDA ÚNICA I TRANSACCIONAL
    const { error } = await supabaseAdmin.rpc('accept_quote_and_create_invoice', {
      p_secure_id: secureId
    });
    if (error) throw error;
    
    return { success: true, message: "Pressupost acceptat i esborrany de factura creat correctament." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut en processar l'acceptació.";
    console.error("[acceptQuote Service] Error:", message);
    return { success: false, message };
  }
}

export async function rejectQuote(secureId: string, reason: string): Promise<FormState> {
  const validation = RejectQuoteSchema.safeParse({ secureId, reason });
  if (!validation.success) {
    return { success: false, message: validation.error.issues[0].message };
  }
  
  const supabaseAdmin = createAdminClient();

  try {
    // ✅ CRIDA ÚNICA I TRANSACCIONAL
    const { error } = await supabaseAdmin.rpc('reject_quote_with_reason', {
      p_secure_id: secureId,
      p_reason: reason
    });
    if (error) throw error;

    return { success: true, message: "El rebuig s'ha processat correctament." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}