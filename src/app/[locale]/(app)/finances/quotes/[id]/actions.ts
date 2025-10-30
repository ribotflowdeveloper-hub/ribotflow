// /app/[locale]/(app)/crm/quotes/[id]/actions.ts (COMPLET I CORREGIT)
"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type Database } from "@/types/supabase";
import type { ActionResult } from "@/types/shared/index";

// Definim els tipus directament des de la base de dades.
type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type Team = Database["public"]["Tables"]["teams"]["Row"];

type QuotePayload = Partial<Omit<Quote, "id">> & {
  id: "new" | number;
  items: Partial<QuoteItem>[];
};

/**
 * Desa (crea o actualitza) un pressupost i els seus conceptes.
 */
export async function saveQuoteAction(
  quoteData: QuotePayload,
): Promise<ActionResult<number>> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session; // Necessitem activeTeamId

  // ✅ MILLORA 2: Validació robusta al servidor
  if (!quoteData.contact_id) {
    return { success: false, message: "Cal seleccionar un client." };
  }

  // Si és un pressupost nou, assegurem que tingui el team_id de la sessió
  if (quoteData.id === "new" && !quoteData.team_id) {
    quoteData.team_id = activeTeamId;
  }

  if (!quoteData.team_id) {
    return {
      success: false,
      message: "El pressupost no està assignat a cap equip.",
    };
  }

  if (quoteData.items.length === 0) {
    return {
      success: false,
      message: "El pressupost ha de tenir almenys un concepte.",
    };
  }

  // Validem que cap concepte sigui invàlid
  const hasInvalidItem = quoteData.items.some(
    (item) =>
      !item.description?.trim() || // Descripció no pot ser buida
      (item.quantity ?? 1) <= 0, // Quantitat ha de ser positiva
  );

  if (hasInvalidItem) {
    return {
      success: false,
      message:
        "Un o més conceptes tenen dades invàlides (descripció buida o quantitat 0).",
    };
  }
  // --- Fi de la validació ---

  try {
    const { data, error } = await supabase.rpc("upsert_quote_with_items", {
      quote_payload: quoteData as QuotePayload,
    });

    if (error) {
      console.error("Supabase RPC Error:", JSON.stringify(error, null, 2));
      // Retornem l'error de la BD si és llegible
      throw new Error(error.message || "Error a la funció RPC 'upsert_quote_with_items'");
    }

    const finalQuoteId = (data as { quote_id: number }).quote_id;

    revalidatePath("/finances/quotes");
    revalidatePath(`/finances/quotes/${finalQuoteId}`);

    return {
      success: true,
      message: "Pressupost desat correctament.",
      data: finalQuoteId,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconegut al desar el pressupost.";
        
    console.error("Error a saveQuoteAction:", message);
    
    // ✅ Missatge d'error més específic si és un error de BD conegut
    if (message.includes("constraint")) {
       return { success: false, message: "Error de dades. Assegura't que tots els camps obligatoris estan omplerts." };
    }
    
    return { success: false, message };
  }
}

// ... (la resta d'accions es mantenen igual)

export async function deleteQuoteAction(quoteId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase } = session;

  try {
    await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    await supabase.from("quotes").delete().eq("id", quoteId);
    revalidatePath("/finances/quotes");
    return { success: true, message: "Pressupost eliminat." };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error en eliminar el pressupost.";
    return { success: false, message };
  }
}

export async function createProductAction(newProduct: {
  name: string;
  price: number;
}): Promise<ActionResult<Product>> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        team_id: activeTeamId,
        name: newProduct.name,
        price: newProduct.price,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath(`/finances/quotes`, "layout");
    return { success: true, message: "Nou producte desat.", data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error en crear el producte.";
    return { success: false, message };
  }
}

export async function sendQuoteAction(quoteId: number): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase } = session;

  try {
    const { error } = await supabase.functions.invoke("send-quote-pdf", {
      body: { quoteId },
    });
    if (error) throw error;
    revalidatePath(`/finances/quotes/${quoteId}`);
    return {
      success: true,
      message: "S'ha iniciat l'enviament del pressupost.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error en invocar l'Edge Function.";
    return { success: false, message };
  }
}

export async function updateTeamProfileAction(
  teamData: Partial<Team>,
): Promise<ActionResult<Team>> {
  const session = await validateUserSession();
  if ("error" in session)
    return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from("teams")
      .update(teamData)
      .eq("id", activeTeamId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/finances/quotes/[id]`, "page");
    return {
      success: true,
      message: "Perfil de l'equip actualitzat.",
      data,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error en actualitzar el perfil.";
    return { success: false, message };
  }
}