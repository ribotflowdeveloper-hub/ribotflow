// Ruta: src/app/(app)/finances/facturacio/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Aquest tipus defineix les dades que el formulari pot enviar.
// És específic per a aquesta acció.
export type InvoiceFormData = {
    id?: string;
    contact_id: string;
    issue_date: string;
    total_amount: number;
    status: 'Paid' | 'Sent' | 'Overdue' | 'Draft';
};

export async function createOrUpdateInvoiceAction(invoiceData: InvoiceFormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    const dataToUpsert = {
        ...invoiceData,
        user_id: user.id,
    };

    try {
        const { error } = await supabase
            .from('invoices')
            .upsert(dataToUpsert, { onConflict: 'id' });

        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: `Factura ${invoiceData.id ? 'actualitzada' : 'creada'} correctament.` };
    } catch (error: unknown) {
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "Ha ocorregut un error inesperat." };
    }
}

// Aquesta funció ara espera un 'string' per ser coherent.
export async function deleteInvoiceAction(invoiceId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuari no autenticat." };
    
    try {
        const { error } = await supabase.from('invoices').delete().match({ id: invoiceId, user_id: user.id });
        if (error) throw error;
        
        revalidatePath('/finances/facturacio');
        return { success: true, message: "Factura eliminada." };
    } catch (error: unknown) {
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        return { success: false, message: "Ha ocorregut un error inesperat." };
    }
}