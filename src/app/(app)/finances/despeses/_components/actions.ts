"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type Expense, type ExpenseItem } from "../page";

// Resultat estàndard
interface ActionResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

// Acció per desar (crear o actualitzar) una despesa
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

  const { expense_items, ...expenseDetails } = expenseData;

  let savedExpense: Expense | null = null;
  let expenseError: { message: string } | null = null;

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

  // Update expense items
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

// OCR
export async function processOcrAction(
  formData: FormData
): Promise<ActionResult<Record<string, unknown>>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.functions.invoke("process-ocr", {
    body: formData,
  });

  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

// Upload
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

  const filePath = `${user.id}/${expenseId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("despeses-adjunts")
    .upload(filePath, file);

  if (uploadError) return { data: null, error: { message: uploadError.message } };

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
