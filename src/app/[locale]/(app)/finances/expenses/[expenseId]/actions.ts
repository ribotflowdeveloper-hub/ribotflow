// src/app/[locale]/(app)/finances/expenses/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  type ExpenseAttachment,
  type ExpenseDetail,
  type ExpenseCategory,
  type ExpensesAnalysisActionResult,
  type ExpensesAnalysisData,
  type ExpenseFormDataForAction,
  expenseSchema
} from "@/types/finances/index";
import { type ActionResult } from "@/types/shared/index";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateActionAndUsage,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

// 👇 1. Importem els serveis modulars
import * as expensesService from "@/lib/services/finances/expenses"; 



import OpenAI from "openai";

/**
 * ACCIÓ: Analitza una factura utilitzant GPT-4o.
 */
export async function analyzeInvoiceFileAction(
  formData: FormData,
): Promise<ExpensesAnalysisActionResult> {
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const validationResult = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_EXPENSES,
  );

  if ("error" in validationResult) {
    return { success: false, message: validationResult.error.message };
  }

  const { supabase, activeTeamId } = validationResult;

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, message: "No s'ha proporcionat cap fitxer." };
  }

  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      message: "El fitxer ha de ser una imatge (PNG o JPEG).",
    };
  }

  try {
    const fileBuffer = await file.arrayBuffer();
    const fileBase64 = Buffer.from(fileBuffer).toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
                Analitza aquesta factura (imatge) i extreu les dades.
                Retorna ÚNICAMENT un objecte JSON vàlid.
                Els camps són: 
                - supplier_name: Nom del proveïdor (string)
                - invoice_number: Número de factura (string)
                - invoice_date: Data d'emissió (string, format YYYY-MM-DD)
                - total_amount: Import total (number)
                - tax_amount: Import d'impostos (number)
                - tax_rate: Percentatge d'impostos (number, ex: 21)
                - currency: Moneda (string, codi ISO 3 lletres, ex: "EUR")
                - items: Array de conceptes (object amb description, quantity, unit_price)

                Si una dada no es pot extreure, posa 'null'.
                Si no hi ha conceptes clars, retorna un array 'items' buit.
              `,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${fileBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Resposta buida d'OpenAI");
    }

    const extractedData = JSON.parse(content) as Omit<ExpensesAnalysisData, "supplier_id">;

    let supplierId: string | null = null;
    if (extractedData.supplier_name) {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("id")
        .eq("team_id", activeTeamId)
        .ilike("nom", `%${extractedData.supplier_name}%`)
        .maybeSingle();

      if (supplier) {
        supplierId = supplier.id;
      }
    }

    return {
      success: true,
      data: {
        ...extractedData,
        supplier_id: supplierId,
      },
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut analitzant la factura";
    console.error("[Action] analyzeInvoiceFileAction error:", message);
    return { success: false, message: "Error analitzant la factura. Torni-ho a provar." };
  }
}

/**
 * ACCIÓ: Obté detall despesa
 */
export async function fetchExpenseDetail(
  expenseId: number,
): Promise<ExpenseDetail | null> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return null;
  const { supabase, activeTeamId } = session;

  try {
    return await expensesService.fetchExpenseDetail(
      supabase,
      expenseId,
      activeTeamId,
    );
  } catch (error) {
    console.error("Error fetching expense detail:", error);
    return null;
  }
}

/**
 * ✅ ACCIÓ: Desa (Insert/Update) una despesa
 * Utilitza Zod per validació i els nous serveis modulars.
 */
export async function saveExpenseAction(
  // Rebem 'unknown' per forçar la validació amb Zod, o bé el tipus del formulari si confiem en el client (però Zod és millor)
  rawExpenseData: unknown, 
  expenseId: string | number | null,
): Promise<ActionResult<{ id: number }>> {
  
  // 1. Validació Zod (Fail Fast)
  const validation = expenseSchema.safeParse(rawExpenseData);

  if (!validation.success) {
    // Retornem el primer error de forma clara
    const errorMessage = validation.error.errors[0]?.message || "Dades invàlides";
    return { success: false, message: errorMessage };
  }

  // Dades netes i tipades segons l'esquema
  const expenseData = validation.data;

  let validationResult;
  const isNew = expenseId === null || expenseId === "new";

  // 2. Validació de límits del pla (només si és nova)
  if (isNew) {
    const limitToCheck: PlanLimit = "maxExpensesPerMonth";
    validationResult = await validateActionAndUsage(
      PERMISSIONS.MANAGE_EXPENSES,
      limitToCheck,
    );
  } else {
    validationResult = await validateSessionAndPermission(
      PERMISSIONS.MANAGE_EXPENSES,
    );
  }

  if ("error" in validationResult) {
    return { success: false, message: validationResult.error.message };
  }

  const { supabase, user, activeTeamId } = validationResult;

  try {
    // 3. Convertim el tipus de Zod al tipus que espera el servei (si calen ajustos)
    // Com que Zod i la interfície ExpenseFormDataForAction haurien de ser gairebé idèntics,
    // fem un cast segur aquí.
    const serviceData = expenseData as unknown as ExpenseFormDataForAction;

    // A. Desar Capçalera
    const { id: resultingExpenseId } = await expensesService.upsertExpenseHeader(
      supabase,
      serviceData,
      isNew ? null : Number(expenseId),
      user.id,
      activeTeamId,
    );

    // B. Sincronitzar Items
    // Passem els items validats per Zod
    await expensesService.syncExpenseItems(
        supabase,
        resultingExpenseId,
        serviceData.expense_items, // Això ve del Zod .data
        user.id,
        activeTeamId
    );

    revalidatePath(`/finances/expenses/${resultingExpenseId}`);
    revalidatePath("/finances/expenses");

    return {
      success: true,
      message: "Despesa desada correctament.",
      data: { id: resultingExpenseId },
    };
  } catch (error: unknown) {
    // ✅ Correcció "Unexpected any": comprovem el tipus d'error
    const message = error instanceof Error ? error.message : "Error desconegut al desar";
    console.error("Error saving expense:", message);
    return { success: false, message: `Error al desar: ${message}` };
  }
}

/**
 * ACCIÓ: Puja adjunt
 */
export async function uploadAttachmentAction(
  expenseId: string | number,
  formData: FormData,
): Promise<ActionResult<{ newAttachment: ExpenseAttachment }>> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  const numericExpenseId = Number(expenseId);
  if (isNaN(numericExpenseId)) {
    return { success: false, message: "ID de despesa invàlid." };
  }

  try {
    const newAttachment = await expensesService.uploadAttachment(
      supabase,
      numericExpenseId,
      formData,
      user.id,
      activeTeamId,
    );

    revalidatePath(`/finances/expenses/${numericExpenseId}`);
    return { success: true, message: "Fitxer pujat.", data: { newAttachment } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Elimina despesa
 */
export async function deleteExpense(expenseId: number): Promise<ActionResult> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  try {
    await expensesService.deleteExpense(supabase, expenseId, activeTeamId);
    revalidatePath("/finances/expenses");
    return { success: true, message: "Despesa eliminada." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

export async function getAttachmentSignedUrl(
  filePath: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { activeTeamId } = session;

  try {
    const signedUrl = await expensesService.getAttachmentSignedUrl(filePath, activeTeamId);
    return { success: true, message: "OK", data: { signedUrl } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

export async function deleteAttachmentAction(
  attachmentId: string,
  filePath: string,
): Promise<ActionResult> {
  const session = await validateSessionAndPermission(PERMISSIONS.MANAGE_EXPENSES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;
  const supabaseAdmin = createAdminClient();

  try {
    await expensesService.deleteAttachment(supabase, supabaseAdmin, attachmentId, filePath, activeTeamId);
    return { success: true, message: "Adjunt eliminat." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

export async function fetchExpenseCategoriesAction(): Promise<ActionResult<ExpenseCategory[]>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('team_id', activeTeamId)
      .order('name');

    if (error) throw error;
    return { success: true, data: data as ExpenseCategory[] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}