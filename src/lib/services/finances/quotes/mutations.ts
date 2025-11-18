import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { type ActionResult } from "@/types/shared/index";
import { type QuotePayload, type Product, type Team } from "@/types/finances/quotes";
import { PostgrestError } from "@supabase/supabase-js";


/**
 * Desa (crea o actualitza) un pressupost.
 */
export async function saveQuote(
  supabase: SupabaseClient<Database>,
  quoteData: QuotePayload,
  teamId: string,
): Promise<ActionResult<number>> {
  // 1. Validació
  const validation = _validateQuote(quoteData);
  if (!validation.success) return validation;

  // 2. Assignació Team ID si és nou
  if (quoteData.id === "new") quoteData.team_id = teamId;

  // 3. Preparem els Items amb les Taxes calculades per l'RPC
  const itemsForRpc = quoteData.items.map(item => {
      const qty = item.quantity ?? 1;
      const price = item.unit_price ?? 0;
      const lineTotal = qty * price;

      // Mapegem les taxes i calculem l'import monetari
      const taxesWithAmount = item.taxes?.map(tax => ({
          id: tax.id,
          name: tax.name,
          rate: tax.rate,
          amount: lineTotal * (tax.rate / 100) 
      })) || [];

      return {
          ...item,
          total: lineTotal,
          taxes: taxesWithAmount
      };
  });

  // 4. Preparem el payload net per a l'RPC
  // ✅ CORRECCIÓ: En lloc de treure el que sobra, seleccionem NOMÉS el que volem.
  // És molt més segur i evita errors "desconeguts" per camps extra.
  
  const payloadForRpc = {
      // Camps obligatoris d'identitat
      id: quoteData.id,
      team_id: quoteData.team_id,
      user_id: quoteData.user_id,
      
      // Camps de dades
      contact_id: quoteData.contact_id,
      opportunity_id: quoteData.opportunity_id,
      quote_number: quoteData.quote_number,
      sequence_number: quoteData.sequence_number,
      issue_date: quoteData.issue_date,
      expiry_date: quoteData.expiry_date,
      status: quoteData.status,
      notes: quoteData.notes,
      
      // Totals calculats
      subtotal: quoteData.subtotal,
      discount_amount: quoteData.discount_amount,
      tax_amount: quoteData.tax_amount,
      total_amount: quoteData.total_amount,
      
      // Configuració visual persistent
      show_quantity: quoteData.show_quantity,
      theme_color: quoteData.theme_color,
      
      // Camps legacy (si cal mantenir-los, sinó null)
      legacy_tax_rate: null, 
      legacy_tax_amount: null,
      
      // Items processats
      items: itemsForRpc
  };

  try {
    const { data, error } = await supabase.rpc("upsert_quote_with_items", {
      quote_payload: payloadForRpc,
    });

    if (error) throw error;

    const finalQuoteId = (data as { quote_id: number }).quote_id;
    return { success: true, message: "Pressupost desat.", data: finalQuoteId };
  } catch (error: unknown) {
    // Si error és un objecte amb 'message' (com els de Postgres), l'agafem
    const message = (error as PostgrestError | Error)?.message || (error instanceof Error ? error.message : "Error desconegut al servidor.");
    
    console.error("Error a saveQuote RPC:", JSON.stringify(error, null, 2));
    
    // Pots personalitzar missatges coneguts per fer-los més amigables
    if (message.includes("constraint")) {
      return { success: false, message: "Falten camps obligatoris." };
    }
    if (message.includes("column")) {
       // Això t'hauria ajudat molt!
      return { success: false, message: `Error de Base de Dades: ${message}` };
    }

    return { success: false, message };
  }
}
/**
 * Esborra un pressupost.
 */
export async function deleteQuote(
  supabase: SupabaseClient<Database>,
  quoteId: number,
): Promise<{ error: PostgrestError | null }> {
  // Primer items, després el pressupost
  const { error: itemsError } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
  if (itemsError) return { error: itemsError };

  const { error: quoteError } = await supabase.from("quotes").delete().eq("id", quoteId);
  return { error: quoteError };
}

/**
 * Crea un producte ràpid.
 */
export async function createProduct(
  supabase: SupabaseClient<Database>,
  newProduct: { name: string; price: number },
  userId: string,
  teamId: string,
): Promise<ActionResult<Product>> {
  try {
    const { data, error } = await supabase
      .from("products")
      .insert({ user_id: userId, team_id: teamId, name: newProduct.name, price: newProduct.price })
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: "Producte creat.", data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Actualitza dades de l'empresa.
 */
export async function updateTeamProfile(
  supabase: SupabaseClient<Database>,
  teamData: Partial<Team>,
  teamId: string,
): Promise<ActionResult<Team>> {
  try {
    const { data, error } = await supabase
      .from("teams")
      .update(teamData)
      .eq("id", teamId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: "Perfil actualitzat.", data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// --- Helper de Validació ---
function _validateQuote(quoteData: QuotePayload): ActionResult<number> {
  if (!quoteData.contact_id) return { success: false, message: "Cal seleccionar un client." };
  // Nota: Assegura't que 'team_id' es valida correctament si ve de 'new'
  if (!quoteData.team_id && quoteData.id !== "new") return { success: false, message: "Sense equip assignat." };
  if (quoteData.items.length === 0) return { success: false, message: "Mínim un concepte requerit." };
  
  const hasInvalidItem = quoteData.items.some(
    (item) => !item.description?.trim() || (item.quantity ?? 1) <= 0
  );
  if (hasInvalidItem) return { success: false, message: "Conceptes invàlids (descripció o quantitat)." };

  return { success: true, message: "Valid" };
}