"use server";

import { validateUserSession } from "@/lib/supabase/session";
import { type InvoiceListRow } from '@/types/finances/invoices';
import { type InvoiceStatus } from '@/types/db'; // ✅ Importem des de db.ts
import { type PaginatedActionParams, type PaginatedResponse } from '@/hooks/usePaginateResource';
import { revalidatePath } from 'next/cache';
import { type ActionResult } from "@/types/shared/actionResult";

// ✅ Importem el nostre servei (i el tipus RpcInvoiceRow que EXPORTA)
import { 
  getPaginatedInvoices, 
  getClientsForFilterService,
  // type RpcInvoiceRow // ❗ Ja no cal importar RpcInvoiceRow aquí
} from '@/lib/services/finances/invoices/invoices.service';

// --- Tipus Específics (Aquests es queden aquí, són per la UI) ---

export interface InvoicePageFilters {
  status: InvoiceStatus | 'all';
  contactId: string | 'all';
}

type FetchInvoicesParams = PaginatedActionParams<InvoicePageFilters>;
type PaginatedInvoicesData = PaginatedResponse<InvoiceListRow>;


// --- Acció Principal (Orquestrador + Traductor) ---
export async function fetchPaginatedInvoices(
  params: FetchInvoicesParams
): Promise<PaginatedInvoicesData> {

  const { searchTerm, filters, sortBy, sortOrder, limit, offset } = params;

  // 1. Validar Sessió
  const session = await validateUserSession();
  if ("error" in session) return { data: [], count: 0 };
  const { supabase, activeTeamId } = session;

  // ✅ CORRECCIÓ: L'Acció fa la "traducció" de la lògica de la UI
  // Converteix els valors 'all' en 'null' o '0' que el servei espera.
  const statusParam = (filters.status === 'all' || !filters.status) ? null : filters.status;
  const contactIdParam = (filters.contactId === 'all' || !filters.contactId) ? 0 : Number(filters.contactId); // O null si 0 no és vàlid

  try {
    // 2. Orquestrar la crida al servei amb paràmetres simples
    const result = await getPaginatedInvoices({
      teamId: activeTeamId,
      supabase: supabase,
      searchTerm,
      statusParam, // ✅ Passa el valor traduït
      contactIdParam, // ✅ Passa el valor traduït
      sortBy: sortBy || 'issue_date',
      sortOrder: sortOrder || 'desc',
      limit,
      offset,
    });

    // 3. Retornar les dades
    return result;

  } catch (error) {
    console.error("Error in fetchPaginatedInvoices action:", error);
    return { data: [], count: 0 };
  }
}

// --- Acció per als Filtres (Correcta) ---
export async function getClientsForFilter(): Promise<{ id: number; nom: string | null }[]> {
  const session = await validateUserSession();
  if ("error" in session) {
    console.error("Session error in getClientsForFilter:", session.error);
    return [];
  }
  return getClientsForFilterService(session.activeTeamId);
}

// --- Acció per Esborrar (Correcta) ---
export async function deleteInvoiceAction(invoiceId: number): Promise<ActionResult> {
    const session = await validateUserSession();
    if ("error" in session) {
      return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    // Aquesta lògica és simple i pot quedar aquí.
    // Si es compliqués (p.ex. comprovar estats abans d'esborrar),
    // la mouríem a un 'deleteInvoiceService'.
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('team_id', activeTeamId);

    if (error) {
      console.error("Error deleting invoice:", error);
      return { success: false, message: "Error en eliminar la factura." };
    }

    revalidatePath('/finances/invoices');
    return { success: true, message: "Factura eliminada correctament." };
}