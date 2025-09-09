// Ruta del fitxer: src/app/(app)/finances/facturacio/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Tipus per a les dades que rebem del formulari
type InvoiceFormData = {
    id?: number;
    contact_id: string;
    issue_date: Date;
    total_amount: number;
    status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
}

export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };

    if (!invoiceData.contact_id || !invoiceData.total_amount) {
        return { success: false, message: "El client i l'import són obligatoris." };
    }
    
    const dataToUpsert = {
        ...invoiceData,
        user_id: user.id,
    };

    try {
        const { error } = await supabase.from('invoices').upsert(dataToUpsert);
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: `Factura ${invoiceData.id ? 'actualitzada' : 'creada'} correctament.` };
    } catch (error: unknown) { // ✅ CORRECCIÓ: Tipem l'error com a 'unknown'
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "Ha ocorregut un error inesperat." };
    }
}


export async function deleteInvoiceAction(invoiceId: number) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    try {
        const { error } = await supabase.from('invoices').delete().match({ id: invoiceId, user_id: user.id });
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura eliminada." };
    } catch (error: unknown) { // ✅ CORRECCIÓ: Tipem l'error com a 'unknown'
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "Ha ocorregut un error inesperat." };
    }
}