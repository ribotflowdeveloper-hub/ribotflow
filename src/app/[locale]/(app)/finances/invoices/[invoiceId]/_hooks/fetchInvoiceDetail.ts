import { validateUserSession } from "@/lib/supabase/session";
import { type InvoiceDetail, type InvoiceItem } from "@/types/finances/invoices";
import { type Database } from "@/types/supabase";
import { TaxRate } from "@/types/finances";

// 1️⃣ DEFINICIÓ DE TIPUS INTERMEDIS
// Definim exactament què ens retorna la consulta SQL amb els JOINs.
// Això evita haver de fer servir 'any'.
type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
type InvoiceItemTaxRow = Database['public']['Tables']['invoice_item_taxes']['Row'];
type InvoiceAttachmentRow = Database['public']['Tables']['invoice_attachments']['Row'];
type ContactRow = Database['public']['Tables']['contacts']['Row'];
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

// Tipus compost: La factura + les relacions niades
type InvoiceResponseWithRelations = InvoiceRow & {
  invoice_items: (InvoiceItemRow & {
    invoice_item_taxes: InvoiceItemTaxRow[];
  })[];
  invoice_attachments: InvoiceAttachmentRow[];
  contacts: ContactRow | null;
};

export async function fetchInvoiceDetail(invoiceId: number): Promise<InvoiceDetail | null> {
    const session = await validateUserSession();
    if ("error" in session) return null;
    const { supabase, activeTeamId } = session;

    // 2️⃣ CONSULTA A LA BASE DE DADES
    const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (
            *,
            invoice_item_taxes (*)
          ),
          invoice_attachments (*),
          contacts (*)
        `)
        .eq('id', invoiceId)
        .eq('team_id', activeTeamId)
        .single();

    if (error || !data) {
        console.error("Error fetching invoice detail:", error?.message);
        return null;
    }

    // 3️⃣ ASSERT DE TIPUS SEGUR
    // Li diem a TypeScript que 'data' compleix amb la nostra estructura definida a dalt.
    // Fem servir 'unknown' com a pas intermedi segur abans del tipus final.
    const rawData = data as unknown as InvoiceResponseWithRelations;

    // 4️⃣ MAPEIG DE DADES (ADAPTER PATTERN)
    // Transformem les dades de la BBDD al format que espera el Frontend (InvoiceDetail)
    
    const invoiceItems: InvoiceItem[] = rawData.invoice_items.map((item) => {
        // Transformem les taxes de la BBDD (invoice_item_taxes) a les taxes del Frontend (TaxRate[])
        const taxes: TaxRate[] = item.invoice_item_taxes.map((tax) => ({
            id: tax.tax_rate_id, // Mapegem l'ID correcte
            name: tax.name,
            rate: tax.rate,
            // Deducció del tipus basada en el nom (si no està explícit)
            type: (tax.name && (tax.name.toLowerCase().includes('irpf') || tax.name.toLowerCase().includes('retenc'))) 
                  ? 'retention' 
                  : 'vat',
            // Afegim camps opcionals si la interfície TaxRate els requereix
            is_default: false, 
            team_id: tax.team_id
        }));

        return {
            ...item,
            id: String(item.id), // Assegurem que l'ID sigui string (UUID)
            taxes: taxes,
            // Assegurem que els camps numèrics no siguin nulls
            discount_percentage: item.discount_percentage ?? 0,
            discount_amount: item.discount_amount ?? 0,
            product_id: item.product_id ?? null,
            reference_sku: item.reference_sku ?? null,
            total: item.total ?? 0, // Assegurem que 'total' sigui number
        };
    });

    // 5️⃣ CONSTRUCCIÓ DE L'OBJECTE FINAL
    const result: InvoiceDetail = {
        ...rawData,
        invoice_items: invoiceItems,
        invoice_attachments: rawData.invoice_attachments.map((att) => ({
            ...att,
            id: String(att.id)
        })),
        // Gestió de nulls per a relacions opcionals
        project_id: rawData.project_id ?? null,
        contact_id: rawData.contact_id ?? null,
        budget_id: rawData.budget_id ?? null,
        quote_id: rawData.quote_id ?? null,
        // Si InvoiceDetail requereix l'objecte sencer de contacte:
        contacts: rawData.contacts ?? undefined 
    } as unknown as InvoiceDetail; // Cast final per ajustar diferències menors de tipus opcionals

    return result;
}