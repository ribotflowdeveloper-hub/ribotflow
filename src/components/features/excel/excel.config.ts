// @/app/[locale]/(app)/excel/excel.config.ts (VERSIÓ CORREGIDA)
import { type PlanLimit } from "@/config/subscriptions";

// --- TIPUS COMPARTITS ---
export interface ColumnInfo {
    column_name: string;
    data_type: string;
}

export type RowToInsert<T extends Record<string, unknown>> = T & {
    team_id: string;
    user_id: string;
};

// Defineix els tipus primitius que esperem a la fila d'exemple
type ExampleRowValue = string | number | boolean | Date | null;

export type TemplateConfig = {
    [key: string]: {
        excludeColumns: string[];
        validations: { [column: string]: string[] };
        exampleRow: { [column: string]: ExampleRowValue };
    };
};

// --- MAPA DE LÍMITS ---
export const resourceKeyMap: { [key: string]: PlanLimit | null } = {
    contacts: "maxContacts",
    invoices: "maxInvoicesPerMonth",
    expenses: "maxExpensesPerMonth",
    quotes: "maxQuotesPerMonth",
    products: "maxProducts",
    suppliers: "maxSuppliers",
};

// --- CONSTANTS DE VALIDACIÓ ---
const FRIENDLY_CONTACT_STATUS = [
    "Client",
    "Lead",
    "Proveïdor",
    "Actiu",
    "Inactiu",
    "Perdut",
];
const QUOTE_STATUS_LIST = ["Draft", "Sent", "Accepted", "Declined"];
const EXPENSE_STATUS_LIST = ["pending", "paid", "overdue", "cancelled"];
const INVOICE_STATUS_LIST = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

// --- CONFIGURACIÓ DE PLANTILLES ---
export const TEMPLATE_CONFIG: TemplateConfig = {
    contacts: {
        // ... (sense canvis)
        excludeColumns: [
            "created_at",
            "last_interaction_at",
            "ultim_contacte",
            "address",
            "social_media",
            "hobbies",
            "supplier_id",
        ],
        validations: {
            estat: FRIENDLY_CONTACT_STATUS,
            gender: ["Masculí", "Femení", "Altres"],
        },
        exampleRow: {
            nom: "Jane Doe",
            empresa: "Exemple SL",
            email: "exemple@domini.com",
            telefon: "600123456",
            estat: "Lead",
            valor: 1000,
            ubicacio: "Girona",
            gender: "Femení",
            birthday: "1990-01-01",
            marital_status: "Solter/a",
            job_title: "CEO",
            industry: "Tecnologia",
            lead_source: "Web",
            notes: "Contacte inicial",
            children_count: 0,
            partner_name: "",
            tax_id: "B12345678",
            street: "Carrer Major 1",
            city: "Girona",
            postal_code: "17001",
            country: "Espanya",
        },
    },
    products: {
        // ... (sense canvis, assumint 0.21 de la correcció anterior)
        excludeColumns: ["created_at"],
        validations: {
            is_active: ["true", "false"],
            unit: ["unitat", "hora", "servei", "producte", "dia", "mes", "any"],
        },
        exampleRow: {
            name: "Producte/Servei Mostra",
            category: "Serveis Web",
            price: 100,
            tax_rate: 0.21, // Corregit
            unit: "hora",
            is_active: true,
            description: "Descripció del servei",
        },
    },
    quotes: {
        // ✅ CORRECCIÓ: Hem tret els camps financers
        excludeColumns: [
            "title",
            "valid_until",
            "terms_and_conditions",
            "contact_id",
            // "subtotal", // TRET
            // "tax_amount", // TRET
            // "discount_amount", // TRET
            // "total_amount", // TRET
            "items", // Encara exclòs, no importem línies
            "created_at",
            "secure_id",
        ],
        validations: { status: QUOTE_STATUS_LIST },
        // ✅ CORRECCIÓ: Afegim els camps financers a l'exemple
        exampleRow: {
            quote_number: "PRE-2025-001", // Corregit
            status: "Draft",
            issue_date: new Date().toISOString().split("T")[0],
            expiry_date:
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    .split("T")[0],
            subtotal: 1000.00, // AFEGIT
            tax_amount: 210.00, // AFEGIT
            discount_amount: 0.00, // AFEGIT
            total_amount: 1210.00, // AFEGIT
            tax_rate: 0.21, // Corregit
            sequence_number: 1001,
            notes: "Notes internes",
            theme_color: "#FFFFFF",
            opportunity_id: null,
            send_at: null,
            sent_at: null,
            rejection_reason: null,
            show_quantity: true,
        },
    },
    expenses: {
        // ... (sense canvis)
        excludeColumns: [
            "created_at",
            "extra_data",
            "project_id",
            "supplier_id",
            "legacy_category_name",
            "legacy_tax_amount",
            "legacy_tax_rate",
            "retention_amount",
            "due_date",
            "discount_rate",
            "category_id",
        ],
        validations: {
            status: EXPENSE_STATUS_LIST,
            is_billable: ["true", "false"],
            is_reimbursable: ["true", "false"],
        },
        exampleRow: {
            description: "Dinar de negocis",
            total_amount: 120.50,
            expense_date: new Date().toISOString().split("T")[0],
            invoice_number: "F2025-001",
            tax_amount: 21.0,
            subtotal: 99.50,
            discount_amount: 0,
            notes: "Client: Acme Corp",
            status: "pending",
            payment_date: null,
            payment_method: "Targeta",
            is_billable: false,
            is_reimbursable: true,
            currency: "EUR",
        },
    },
    invoices: {
        // ... (sense canvis)
        excludeColumns: [
            "created_at",
            "updated_at",
            "contact_id",
            "quote_id",
            "project_id",
            "budget_id",
            "extra_data",
            "verifactu_uuid",
            "verifactu_qr_data",
            "verifactu_signature",
            "verifactu_previous_signature",
            "legacy_tax_rate",
            "legacy_tax_amount",
            "tax",
            "discount",
            "paid_at",
            "sent_at",
            "retention_amount",
            "company_logo_url",
        ],
        validations: {
            status: INVOICE_STATUS_LIST,
        },
        exampleRow: {
            invoice_number: "F-2025-001",
            issue_date: new Date().toISOString().split("T")[0],
            due_date:
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    .split("T")[0],
            status: "Draft",
            total_amount: 1210.00,
            subtotal: 1000.00,
            tax_amount: 210.00,
            discount_amount: 0,
            shipping_cost: 0,
            notes: "Notes de la factura",
            terms: "Pagament a 30 dies",
            currency: "EUR",
            language: "ca",
            client_name: "Nom Client Exemple",
            client_tax_id: "B12345678",
            client_address: "Carrer Fals 123, 08001 Barcelona",
            client_email: "client@exemple.com",
            company_name: "La Meva Empresa SL",
            company_tax_id: "B87654321",
            company_address: "Avinguda Diagonal 456, 08002 Barcelona",
            company_email: "info@lamevaempresa.com",
            payment_details: "IBAN: ES00 0000 0000 0000 0000 0000",
            client_reference: "Ref. Client 001",
        },
    },
    suppliers: {
        // ... (sense canvis)
        excludeColumns: [
            "created_at",
        ],
        validations: {},
        exampleRow: {
            nom: "Proveïdor Exemple SL",
            email: "info@proveidor.com",
            telefon: "972123456",
            nif: "B12345678",
        },
    },
};
