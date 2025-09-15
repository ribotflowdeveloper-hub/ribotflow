/**
 * @file actions.ts (Despeses)
 * @summary Aquest fitxer conté totes les Server Actions per al mòdul de Gestió de Despeses.
 * Les funcions aquí s'executen de manera segura al servidor i són responsables de la interacció
 * amb la base de dades i serveis externs, com desar despeses, processar documents amb OCR
 * i pujar fitxers adjunts a Supabase Storage.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type Expense, type ExpenseItem } from "../page";

// Definim un tipus de resultat genèric per a les nostres accions.
interface ActionResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * @summary Desa una despesa, ja sigui creant-ne una de nova o actualitzant-ne una d'existent.
 * També gestiona els ítems de la despesa de manera transaccional.
 * @param {Omit<Expense, ...>} expenseData - Les dades de la despesa a desar.
 * @param {string | null} expenseId - L'ID de la despesa a actualitzar, o null si és una de nova.
 * @returns {Promise<ActionResult<Expense>>} La despesa desada o un objecte d'error.
 */
export async function saveExpenseAction(
  expenseData: Omit<
    Expense,
    "id" | "created_at" | "user_id" | "suppliers" | "expense_attachments"
  >,
  expenseId: string | null
): Promise<ActionResult<Expense>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } };
  
  // Separem els detalls de la despesa dels seus ítems per a un maneig separat.

  const { expense_items, ...expenseDetails } = expenseData;

  let savedExpense: Expense | null = null;
  let expenseError: { message: string } | null = null;
// Lògica d'Upsert: si hi ha un ID, fem un UPDATE; si no, fem un INSERT.
  if (expenseId) {
    // Update
    const { data, error } = await supabase
      .from("expenses")
      .update(expenseDetails)
      .eq("id", expenseId)
      .select()
      .single();
    savedExpense = data as Expense | null;
    if (error) expenseError = { message: error.message };
  } else {
    // Insert
    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...expenseDetails, user_id: user.id })
      .select()
      .single();
    savedExpense = data as Expense | null;
    if (error) expenseError = { message: error.message };
  }

  if (expenseError) return { data: null, error: expenseError };
  if (!savedExpense)
    return { data: null, error: { message: "Could not save expense" } };

  // Gestió dels ítems de la despesa: esborrem els antics i inserim els nous.
  // Això simplifica la lògica d'actualització.
  if (expense_items) {
    await supabase.from("expense_items").delete().eq("expense_id", savedExpense.id);

    const itemsToInsert = expense_items.map((item: ExpenseItem) => ({
      ...item,
      expense_id: savedExpense!.id,
      user_id: user.id,
    }));

    const { error: itemsError } = await supabase
      .from("expense_items")
      .insert(itemsToInsert);
    if (itemsError) return { data: null, error: { message: itemsError.message } };
  }

  revalidatePath("/finances/despeses");
  return { data: savedExpense, error: null };
}

/**
 * @summary Processa un fitxer (factura, tiquet) mitjançant una Edge Function d'OCR (Reconeixement Òptic de Caràcters).
 * @param {FormData} formData - El formulari que conté el fitxer a processar.
 * @returns {Promise<ActionResult<Record<string, unknown>>>} Les dades extretes del document o un error.
 */
export async function processOcrAction(
  formData: FormData
): Promise<ActionResult<Record<string, unknown>>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
// Deleguem tota la lògica complexa de l'OCR a una Edge Function.
  const { data, error } = await supabase.functions.invoke("process-ocr", {
    body: formData,
  });

  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

/**
 * @summary Puja un fitxer adjunt a Supabase Storage i crea el registre corresponent a la base de dades.
 * @param {string} expenseId - L'ID de la despesa a la qual s'adjunta el fitxer.
 * @param {FormData} formData - El formulari que conté el fitxer.
 * @returns {Promise<ActionResult<null>>} Un resultat indicant l'èxit o l'error de l'operació.
 */
export async function uploadAttachmentAction(
  expenseId: string,
  formData: FormData
): Promise<ActionResult<null>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } };

  const file = formData.get("file") as File | null;
  if (!file) return { data: null, error: { message: "No file provided" } };
// Pas 1: Pujar el fitxer a Supabase Storage.
  const filePath = `${user.id}/${expenseId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("despeses-adjunts")
    .upload(filePath, file);

  if (uploadError) return { data: null, error: { message: uploadError.message } };
// Pas 2: Crear el registre a la taula 'expense_attachments' amb la ruta del fitxer.
  const { error: dbError } = await supabase.from("expense_attachments").insert({
    expense_id: expenseId,
    user_id: user.id,
    file_path: filePath,
    filename: file.name,
    mime_type: file.type,
  });

  if (dbError) return { data: null, error: { message: dbError.message } };

  revalidatePath("/finances/despeses");
  return { data: null, error: null };
}
