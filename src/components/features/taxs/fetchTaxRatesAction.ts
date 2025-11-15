"use server";

import {
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type ActionResult } from "@/types/shared/index";
import { type TaxRate } from "@/types/finances/index";
/**
 * ACCIÓ: Obté el catàleg d'impostos per a l'equip actiu.
 */
export async function fetchTaxRatesAction(): Promise<ActionResult<TaxRate[]>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('team_id', activeTeamId)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }
    
    // Assegurem el tipus de retorn
    return { success: true, data: data as TaxRate[] };

  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error fetching tax rates (action):", message);
    return { success: false, message };
  }
}