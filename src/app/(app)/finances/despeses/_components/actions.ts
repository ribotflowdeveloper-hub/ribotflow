"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type Expense, type ExpenseItem } from '../page'; // Importarem els tipus

// Acció per desar (crear o actualitzar) una despesa
export async function saveExpenseAction(
  expenseData: Omit<Expense, 'id' | 'created_at' | 'user_id' | 'suppliers' | 'expense_attachments'>,
  expenseId: string | null
): Promise<{ data: Expense | null, error: any }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } };

  const { expense_items, ...expenseDetails } = expenseData;

  let savedExpense: Expense | null = null;
  let expenseError: any = null;

  if (expenseId) { // Update
    const { data, error } = await supabase
      .from('expenses')
      .update(expenseDetails)
      .eq('id', expenseId)
      .select()
      .single();
    savedExpense = data;
    expenseError = error;
  } else { // Insert
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expenseDetails, user_id: user.id })
      .select()
      .single();
    savedExpense = data;
    expenseError = error;
  }

  if (expenseError) return { data: null, error: expenseError };
  if (!savedExpense) return { data: null, error: { message: "Could not save expense" } };

  // Update expense items
  if (expense_items) {
    // Delete old items
    await supabase.from('expense_items').delete().eq('expense_id', savedExpense.id);
    // Insert new items
    const itemsToInsert = expense_items.map((item: any) => ({ ...item, expense_id: savedExpense.id, user_id: user.id }));
    const { error: itemsError } = await supabase.from('expense_items').insert(itemsToInsert);
    if (itemsError) return { data: null, error: itemsError };
  }

  revalidatePath('/finances/despeses');
  return { data: savedExpense, error: null };
}

// Acció per processar un arxiu amb OCR (crida a una Edge Function)
export async function processOcrAction(formData: FormData): Promise<{ data: any, error: any }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Aquesta crida és segura perquè el token de l'usuari s'afegeix automàticament
  const { data, error } = await supabase.functions.invoke('process-ocr', {
    body: formData,
  });

  return { data, error };
}

// Acció per pujar un adjunt a Supabase Storage
export async function uploadAttachmentAction(
  expenseId: string,
  formData: FormData
): Promise<{ error: any }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not authenticated" } };

  const file = formData.get('file') as File;
  if (!file) return { error: { message: "No file provided" } };

  const filePath = `${user.id}/${expenseId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('despeses-adjunts')
    .upload(filePath, file);

  if (uploadError) return { error: uploadError };

  const { error: dbError } = await supabase.from('expense_attachments').insert({
    expense_id: expenseId,
    user_id: user.id,
    file_path: filePath,
    filename: file.name,
    mime_type: file.type,
  });

  revalidatePath('/finances/despeses');
  return { error: dbError };
}