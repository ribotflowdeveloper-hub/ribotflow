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
import { type Expense, type ExpenseItem } from "../types";

// Definim un tipus de resultat genèric per a les nostres accions.
interface ActionResult<T = unknown> {
    data: T | null;
    error: { message: string } | null;
}



/**
 * @summary Processa un fitxer (factura, tiquet) mitjançant una Edge Function d'OCR (Reconeixement Òptic de Caràcters).
 * @param {FormData} formData - El formulari que conté el fitxer a processar.
 * @returns {Promise<ActionResult<Record<string, unknown>>>} Les dades extretes del document o un error.
 */
export async function processOcrAction(
    formData: FormData
): Promise<ActionResult<Record<string, unknown>>> {
    const supabase = createClient(cookies())
        ;
    // Deleguem tota la lògica complexa de l'OCR a una Edge Function.
    const { data, error } = await supabase.functions.invoke("process-ocr", {
        body: formData,
    });

    if (error) return { data: null, error: { message: error.message } };
    return { data, error: null };
}


interface ActionResult<T = unknown> {
    data: T | null;
    error: { message: string } | null;
}


export async function saveExpenseAction(
    expenseData: Omit<Expense, "id" | "created_at" | "user_id" | "team_id" | "suppliers" | "expense_attachments"> & { expense_items: ExpenseItem[] },
    expenseId: string | null
): Promise<ActionResult<Expense>> {
    console.log('Objecte rebut al servidor:', expenseData);

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { data: null, error: { message: "No active team selected" } };
    }

    // Separem els conceptes de la resta de detalls de la despesa
    const { expense_items, ...expenseDetails } = expenseData;

    // ✅ PAS CLAU: Assegurem el format de la data abans d'enviar-la a la BBDD
    if (expenseDetails.expense_date) {
        // Convertim la data ISO string a 'AAAA-MM-DD'
        try {
            expenseDetails.expense_date = new Date(expenseDetails.expense_date)
                .toISOString()
                .split('T')[0];
        } catch (e) {
            // Imprimim l'error real al terminal del servidor
            console.error("Error al formatar la data de la despesa:", e);
            return { data: null, error: { message: "Format de data invàlid." } };
        }
    }
    let savedExpense: Expense | null = null;
    let expenseError: { message: string } | null = null;

    // Pas 1: Desar la despesa principal (crear o actualitzar)
    if (expenseId) {
        // Actualitzem la despesa existent
        const { data, error } = await supabase
            .from("expenses")
            .update(expenseDetails)
            .eq("id", expenseId)
            .select()
            .single();
        savedExpense = data as Expense | null;
        if (error) expenseError = { message: error.message };
    } else {
        // Creem una nova despesa
        const { data, error } = await supabase
            .from("expenses")
            .insert({ ...expenseDetails, user_id: user.id, team_id: activeTeamId })
            .select()
            .single();
        savedExpense = data as Expense | null;
        if (error) expenseError = { message: error.message };
    }

    if (expenseError) return { data: null, error: expenseError };
    if (!savedExpense) return { data: null, error: { message: "Could not save expense" } };

    // Pas 2: Gestionar els conceptes (`expense_items`) amb la nova lògica
    if (expense_items) {
        // Obtenim els IDs dels conceptes que arriben del formulari (només els que ja existien)
        const itemIdsFromForm = expense_items.map(item => item.id).filter(Boolean);

        // Esborrem els conceptes que estiguin a la BBDD però no al formulari
        // (l'usuari els ha eliminat)
        if (itemIdsFromForm.length > 0) {
            const { error: deleteError } = await supabase
                .from('expense_items')
                .delete()
                .eq('expense_id', savedExpense.id)
                .not('id', 'in', `(${itemIdsFromForm.join(',')})`);

            if (deleteError) return { data: null, error: { message: `Error deleting old items: ${deleteError.message}` } };
        } else if (expenseId) {
            // Si és una actualització i no arriba cap concepte amb ID, els esborrem tots
            const { error: deleteAllError } = await supabase
                .from('expense_items')
                .delete()
                .eq('expense_id', savedExpense.id);

            if (deleteAllError) return { data: null, error: { message: `Error deleting all items: ${deleteAllError.message}` } };
        }

        // Preparem els conceptes per a l'operació `upsert`
        const itemsToUpsert = expense_items.map((item: ExpenseItem) => ({
            // ✅ AFEGEIX L'ID NOMÉS SI JA EXISTEIX
            ...(item.id && { id: item.id }),

            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            expense_id: savedExpense!.id,
            user_id: user.id,
            team_id: activeTeamId
        }));

        // Fem upsert: actualitza els existents i insereix els nous
        if (itemsToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from("expense_items").upsert(itemsToUpsert);
            if (upsertError) {
                console.error("DETALLS DE L'ERROR UPSERT:", upsertError); // Línia de depuració útil
                return { data: null, error: { message: `Error upserting items: ${upsertError.message}` } };
            }
        }

    } else if (expenseId) {
        // Si és una actualització i no rebem `expense_items`, vol dir que s'han esborrat tots
        await supabase.from("expense_items").delete().eq("expense_id", savedExpense.id);
    }

    revalidatePath("/finances/despeses");
    return { data: savedExpense, error: null };
}

// ... Les teves altres accions com processOcrAction es poden quedar igual ...

export async function uploadAttachmentAction(
    expenseId: string,
    formData: FormData
): Promise<ActionResult<null>> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { data: null, error: { message: "No active team selected" } };
    }
    // ---------------------------------

    const file = formData.get("file") as File | null;
    if (!file) return { data: null, error: { message: "No file provided" } };

    // ✅ La ruta d'emmagatzematge ara podria organitzar-se per equip
    const filePath = `${activeTeamId}/${expenseId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from("despeses-adjunts")
        .upload(filePath, file);

    if (uploadError) return { data: null, error: { message: uploadError.message } };

    // ✅ Afegim 'team_id' al registre de l'adjunt
    const { error: dbError } = await supabase.from("expense_attachments").insert({
        expense_id: expenseId,
        user_id: user.id,
        team_id: activeTeamId,
        file_path: filePath,
        filename: file.name,
        mime_type: file.type,
    });

    if (dbError) return { data: null, error: { message: dbError.message } };

    revalidatePath("/finances/despeses");
    return { data: null, error: null };
}
