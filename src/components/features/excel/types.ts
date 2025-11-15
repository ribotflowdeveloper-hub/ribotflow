// @/app/[locale]/(app)/excel/excel.config.ts
import { type PlanLimit } from "@/config/subscriptions";
// @/app/[locale]/(app)/excel/types.ts
import { type LucideIcon } from "lucide-react";
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

// --- CONFIGURACIÓ DE PLANTILLES ---
export const TEMPLATE_CONFIG: TemplateConfig = {
  contacts: {
    excludeColumns: [
      "created_at",
      "last_interaction_at",
      "id",
      "user_id",
      "team_id",
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
    },
  },
  products: {
    excludeColumns: ["created_at", "id", "user_id", "team_id"],
    validations: {
      is_active: ["true", "false"],
      unit: ["unitat", "hora", "servei", "producte", "dia", "mes", "any"],
    },
    exampleRow: {
      name: "Producte/Servei Mostra",
      category: "Serveis Web",
      price: 100,
      tax_rate: 21,
      unit: "hora",
      is_active: true,
      description: "Descripció del servei",
    },
  },
  quotes: {
    excludeColumns: [
      "created_at",
      "quote_number",
      "total_amount",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "secure_id",
      "items",
      "contact_id",
      "id",
      "user_id",
      "team_id",
    ],
    validations: { status: QUOTE_STATUS_LIST },
    exampleRow: {
      title: "Disseny Web Corporativa (Exemple)",
      issue_date: new Date().toISOString().split("T")[0],
      valid_until:
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split(
          "T",
        )[0],
      status: "Draft",
      notes: "Notes internes",
      terms_and_conditions: "Termes de pagament: 50% avançat.",
    },
  },
};


/**
 * Defineix la forma d'una opció del desplegable d'Excel.
 */
export interface DropdownOption {
  value: string;
  label: string;
  icon: LucideIcon | React.ElementType;
}