// /app/[locale]/(app)/crm/quotes/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import type { Database } from '@/types/supabase';
import { type ActionResult } from '@/types/shared/actionResult';
import {
  type PaginatedActionParams,
  type PaginatedResponse
} from '@/hooks/usePaginateResource'; // Corregit prèviament

// --- Tipus Específics ---
type Quote = Database['public']['Tables']['quotes']['Row'] & {
  currency?: string | null;
  language?: string | null;
  terms?: string | null;
  updated_at?: string | null;
  subtotal?: number | null;
  tax_percent?: number | null;
  show_quantity?: boolean | null;
  discount?: number | null;
  tax?: number | null;
  verifactu_uuid?: string | null;
};

// Tipus QuoteWithContact: Basat en Quote, amb 'contacts'
export type QuoteWithContact = Quote & {
  contacts: { nom: string; empresa: string | null } | null; // 'nom' ja no pot ser null aquí
};

type QuoteId = Quote['id'];
export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced';

export interface QuotePageFilters {
  status: QuoteStatus | 'all';
}
type FetchQuotesParams = PaginatedActionParams<QuotePageFilters>;
type PaginatedQuotesData = PaginatedResponse<QuoteWithContact>;

// --- Tipus per a la Resposta RPC (Reflectint SQL corregit) ---
interface RpcQuoteRow {
    id: QuoteId;
    quote_number: string | null;
    issue_date: string;
    expiry_date: string | null;
    total: number | null;
    status: QuoteStatus;
    // client_name: string | null; // ❗ Eliminat
    contact_id: number | null;
    currency: string | null;
    terms: string | null;
    language: string | null;
    created_at: string;
    updated_at: string | null;
    subtotal: number | null;
    tax_percent: number | null;
    show_quantity: boolean | null;
    discount: number | null;
    tax: number | null;
    opportunity_id: number | null;
    send_at: string | null;
    secure_id: string | null;
    sent_at: string | null;
    notes: string | null;
    rejection_reason: string | null;
    theme_color: string | null;
    sequence_number: number | null;
    user_id: string;
    team_id: string;
    verifactu_uuid: string | null;
    // Camps del JOIN
    contact_nom: string | null;
    contact_empresa: string | null;
    total_count: number;
}


// --- Acció per Obtenir Dades Paginades ---
export async function fetchPaginatedQuotes(
  params: FetchQuotesParams
): Promise<PaginatedQuotesData> {

    const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;
    const session = await validateUserSession();
    if ("error" in session) return { data: [], count: 0 };
    const { supabase, activeTeamId } = session;

    const statusParam = (filters.status === 'all' || !filters.status) ? null : filters.status;
    // ✅ Ajustem effectiveSortBy per utilitzar 'c.nom' si es vol ordenar per client
    const effectiveSortBy = sortBy === 'client_name' ? 'c.nom' : (sortBy || 'issue_date');

    const rpcParams = {
        team_id_param: activeTeamId,
        search_term_param: searchTerm || null,
        status_param: statusParam,
        sort_by_param: effectiveSortBy, // Passa 'c.nom' si cal
        sort_order_param: sortOrder || 'desc',
        limit_param: limit,
        offset_param: offset,
    };

    console.log("Calling RPC 'search_paginated_quotes' with params:", rpcParams);
    const { data, error } = await supabase
        .rpc('search_paginated_quotes', rpcParams)
        .returns<RpcQuoteRow[]>();

    if (error) {
        console.error("Error calling search_paginated_quotes RPC:", {
            message: error.message, code: error.code, details: error.details, rpcParams
        });
        return { data: [], count: 0 };
    }
    if (!Array.isArray(data) || data.length === 0) {
        console.log("RPC returned no data.");
        return { data: [], count: 0 };
    }

    const totalCount = data[0].total_count ?? 0;
    console.log(`RPC returned ${data.length} rows, total count: ${totalCount}`);

    const mappedData: QuoteWithContact[] = data.map((row): QuoteWithContact | null => {
        if (!row || typeof row !== 'object') {
             console.warn("Invalid row data found during mapping:", row);
             return null;
        }

        const quoteBase: Quote = {
            id: row.id,
            sequence_number: row.sequence_number,
            user_id: row.user_id,
            contact_id: row.contact_id,
            team_id: row.team_id,
            tax_percent: row.tax_percent,
            show_quantity: row.show_quantity ?? true,
            status: row.status,
            issue_date: row.issue_date,
            expiry_date: row.expiry_date,
            subtotal: row.subtotal ?? 0, // Assegura que subtotal sigui sempre number
            discount: row.discount,
            tax: row.tax,
            total: row.total ?? 0, // Assegura que total sigui sempre number
            created_at: row.created_at, // Assegura que Quote permet string aquí
            opportunity_id: row.opportunity_id,
            send_at: row.send_at,
            secure_id: row.secure_id ?? '', // Assegura que sempre sigui string
            sent_at: row.sent_at,
            quote_number: row.quote_number ?? '', // Assegura que sempre sigui string
            notes: row.notes,
            rejection_reason: row.rejection_reason,
            theme_color: row.theme_color,
            currency: row.currency ?? 'EUR',
            language: row.language ?? 'ca',
            terms: row.terms,
            updated_at: row.updated_at,
            verifactu_uuid: row.verifactu_uuid,
            // ❗ Eliminat client_name de quoteBase si no existeix a Quote
            // client_name: row.client_name,
        };

        return {
            ...quoteBase,
            contacts: row.contact_id ? {
                nom: row.contact_nom ?? '', // Default a string buit
                empresa: row.contact_empresa // Permet null
            } : null,
        };
    }).filter((item): item is QuoteWithContact => item !== null);

    console.log(`Mapped ${mappedData.length} valid rows.`);

    return {
        data: mappedData,
        count: totalCount
    };
}
/**
 * Esborra un pressupost i els seus items associats.
 * Retorna ActionResult.
 */
export async function deleteQuoteAction(quoteId: QuoteId): Promise<ActionResult> { // <-- Retorna ActionResult
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    if (!quoteId) {
        return { success: false, message: "ID de pressupost invàlid." };
    }

    // Eliminem items primer (si RLS ho permet o si s'usa client Admin)
    const { error: itemsError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId);

    if (itemsError) {
        console.error("Error deleting quote items:", itemsError);
        return { success: false, message: "No s'han pogut eliminar els detalls del pressupost." };
    }

    // Eliminem el pressupost
    const { error: quoteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

    if (quoteError) {
        console.error("Error deleting quote:", quoteError);
        return { success: false, message: "No s'ha pogut eliminar el pressupost." };
    }

    revalidatePath('/crm/quotes');
    return { success: true, message: "Pressupost eliminat correctament." };
}

// --- (Opcional) Acció per obtenir opcions de filtre (Ex: Contactes) ---
// Similar a getClientsForFilter d'invoices si cal
/*
export async function getContactsForQuoteFilter(): Promise<{ id: number; nom: string | null }[]> {
    // ... lògica similar ...
}
*/