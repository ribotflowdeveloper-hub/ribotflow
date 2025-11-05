// src/app/[locale]/quote/[secureId]/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
// ❌ Eliminem 'createAdminClient', 'zod', 'QuoteItem'

// ✅ 1. Importem el NOU servei i els seus tipus
import * as publicQuoteService from '@/lib/services/publicQuote/public-quote.service';
import type { FormState } from '@/lib/services/publicQuote/public-quote.service';

/**
 * Gestiona l'acceptació d'un pressupost.
 */
export async function acceptQuoteAction(secureId: string): Promise<FormState> {
  // 1. Crida al servei (la validació Zod i la RPC es fan dins)
  const result = await publicQuoteService.acceptQuote(secureId);

  // 2. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/finances/quotes');
    revalidatePath('/finances/facturacio');
  }

  return result;
}

/**
 * Gestiona el rebuig d'un pressupost.
 */
export async function rejectQuoteAction(secureId: string, reason: string): Promise<FormState> {
  // 1. Crida al servei (la validació Zod i la RPC es fan dins)
  const result = await publicQuoteService.rejectQuote(secureId, reason);

  // 2. Efectes (revalidació)
  if (result.success) {
    revalidatePath('/finances/quotes');
    revalidatePath('/crm/activitats'); // Revalidem també activitats
  }

  return result;
}