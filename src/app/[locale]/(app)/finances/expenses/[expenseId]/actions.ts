// src/app/[locale]/(app)/finances/expenses/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  type ExpenseAttachment,
  type ExpenseDetail,
  type ExpenseFormDataForAction,
  // ✅ 1. Importem els tipus correctes (amb 'Expenses')
  type ExpensesAnalysisActionResult,
  type ExpensesAnalysisData,
} from "@/types/finances/expenses";
import { type ActionResult } from "@/types/shared/index";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateActionAndUsage,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions.config";
import { type PlanLimit } from "@/config/subscriptions";

import * as expensesService from "@/lib/services/finances/expenses/expenseDetail.service";

// ✅ 2. Importem OpenAI
import OpenAI from "openai";


/**
 * ACCIÓ: Analitza una imatge de factura i retorna dades estructurades.
 * Aquesta és una acció SÍNCRONA.
 */
export async function analyzeInvoiceFileAction(
  formData: FormData,
): Promise<ExpensesAnalysisActionResult> { // ✅ 4. Tipus de retorn estricte
  
  // ✅ NOMÉS ES CREA QUAN S'EXECUTA L'ACCIÓ
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // 1. Validar permís
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
    // 2. Convertir fitxer a Base64
    const fileBuffer = await file.arrayBuffer();
    const fileBase64 = Buffer.from(fileBuffer).toString("base64");

    // 3. Cridar a OpenAI GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              // El prompt ha d'incloure 'tax_rate'
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

    // ✅ 5. CORRECCIÓ CLAU:
    // Fem el 'cast' al tipus correcte, excloent només 'supplier_id'
    const extractedData = JSON.parse(content) as Omit<
      ExpensesAnalysisData,
      "supplier_id"
    >;

    // 6. Enriquir amb dades de la nostra BD (Cercar el proveïdor)
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

    // ✅ 7. Ara 'data' coincideix perfectament amb 'ExpensesAnalysisData'
    return {
      success: true,
      data: {
        ...extractedData,
        supplier_id: supplierId,
      },
    };
  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error analyzing invoice file (action):", message);
    return { success: false, message };
  }
}

// --- Resta de les teves Server Actions ---
// (fetchExpenseDetail, saveExpenseAction, uploadAttachmentAction, etc.)

/**
 * ACCIÓ: Obté el detall d'una despesa.
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
    console.error("Error fetching expense detail (action):", error);
    return null;
  }
}

/**
 * ACCIÓ: Desa una despesa (crea o actualitza).
 */
export async function saveExpenseAction(
  expenseData: ExpenseFormDataForAction,
  expenseId: string | number | null,
): Promise<ActionResult<{ id: number }>> {
  let validationResult;
  const isNew = expenseId === null || expenseId === "new";

  if (isNew) {
    const limitToCheck: PlanLimit = "maxExpensesPerMonth";
    console.log(`[saveExpenseAction] Comprovant límit: ${limitToCheck}`);
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
    const { id: resultingExpenseId } = await expensesService.saveExpense(
      supabase,
      expenseData,
      expenseId,
      user.id,
      activeTeamId,
    );

    revalidatePath(`/finances/expenses/${resultingExpenseId}`);
    revalidatePath("/finances/expenses");

    return {
      success: true,
      message: "Despesa desada.",
      data: { id: resultingExpenseId },
    };
  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error saving expense (action):", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Puja un adjunt.
 */
export async function uploadAttachmentAction(
  expenseId: string | number,
  formData: FormData,
): Promise<ActionResult<{ newAttachment: ExpenseAttachment }>> {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_EXPENSES,
  );
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
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

    return { success: true, message: "Adjunt pujat.", data: { newAttachment } };
  } catch (error: unknown) {
    const message = (error as Error).message;
    console.error("Error uploading attachment (action):", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Elimina una despesa.
 */
export async function deleteExpense(expenseId: number): Promise<ActionResult> {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_EXPENSES,
  );
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  try {
    await expensesService.deleteExpense(supabase, expenseId, activeTeamId);
    revalidatePath("/finances/expenses");
    return { success: true, message: `Despesa eliminada correctament.` };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Obté una URL signada per a un adjunt.
 */
export async function getAttachmentSignedUrl(
  filePath: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { activeTeamId } = session;

  try {
    const signedUrl = await expensesService.getAttachmentSignedUrl(
      filePath,
      activeTeamId,
    );
    return {
      success: true,
      message: "URL signada generada.",
      data: { signedUrl },
    };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Elimina un adjunt.
 */
export async function deleteAttachmentAction(
  attachmentId: string,
  filePath: string,
): Promise<ActionResult> {
  const session = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_EXPENSES,
  );
  if ("error" in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase, activeTeamId } = session;

  const supabaseAdmin = createAdminClient();

  try {
    await expensesService.deleteAttachment(
      supabase,
      supabaseAdmin,
      attachmentId,
      filePath,
      activeTeamId,
    );
    return { success: true, message: "Adjunt eliminat correctament." };
  } catch (error: unknown) {
    const message = (error as Error).message;
    return { success: false, message };
  }
}
