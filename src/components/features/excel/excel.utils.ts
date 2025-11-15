// @/app/[locale]/(app)/excel/excel.utils.ts (CORREGIT)
import ExcelJS from "exceljs";
import { type ColumnInfo } from "./excel.config";

// --- MAPES DE PARSING ---
const CONTACT_STATUS_IMPORT_MAP: { [key: string]: string } = {
  "client": "C",
  "lead": "L",
  "proveïdor": "P",
  "actiu": "A",
  "inactiu": "I",
  "perdut": "X",
  "c": "C",
  "l": "L",
  "p": "P",
  "a": "A",
  "i": "I",
  "x": "X",
};

const QUOTE_STATUS_IMPORT_MAP: { [key: string]: string } = {
  "draft": "Draft",
  "esborrany": "Draft",
  "sent": "Sent",
  "enviat": "Sent",
  "accepted": "Accepted",
  "acceptat": "Accepted",
  "declined": "Declined",
  "rebutjat": "Declined",
};

const EXPENSE_STATUS_IMPORT_MAP: { [key: string]: string } = {
  "pending": "pending",
  "pendent": "pending",
  "paid": "paid",
  "pagat": "paid",
  "overdue": "overdue",
  "vençut": "overdue",
  "vencut": "overdue",
  "cancelled": "cancelled",
  "cancel·lat": "cancelled",
  "cancelat": "cancelled"
};

// ✅ AFEGIT MAPA PER A INVOICES
const INVOICE_STATUS_IMPORT_MAP: { [key: string]: string } = {
  "draft": "Draft",
  "esborrany": "Draft",
  "sent": "Sent",
  "enviat": "Sent",
  "paid": "Paid",
  "pagat": "Paid",
  "overdue": "Overdue",
  "vençut": "Overdue",
  "vencut": "Overdue",
  "cancelled": "Cancelled",
  "cancel·lat": "Cancelled",
  "cancelat": "Cancelled"
};

// --- FUNCIONS DE VALIDACIÓ I PARSING ---
export function parseCellValue(
  cellValue: ExcelJS.CellValue,
  columnInfo: ColumnInfo | undefined,
  tableName: string,
): unknown {
  if (!columnInfo || cellValue === null || cellValue === undefined) {
    return cellValue;
  }
  if (typeof cellValue === "string") {
    const trimmedValue = cellValue.trim();
    const lowerTrimmed = trimmedValue.toLowerCase();
    if (trimmedValue === "") return null;

    if (tableName === "contacts" && columnInfo.column_name === "estat") {
      const mappedValue = CONTACT_STATUS_IMPORT_MAP[lowerTrimmed];
      return mappedValue || trimmedValue.toUpperCase();
    }
    if (tableName === "quotes" && columnInfo.column_name === "status") {
      const mappedValue = QUOTE_STATUS_IMPORT_MAP[lowerTrimmed];
      return mappedValue || "Draft";
    }
    if (tableName === "expenses" && columnInfo.column_name === "status") {
      const mappedValue = EXPENSE_STATUS_IMPORT_MAP[lowerTrimmed];
      return mappedValue || "pending";
    }
    // ✅ AFEGIT BLOC PER A INVOICES
    if (tableName === "invoices" && columnInfo.column_name === "status") {
      const mappedValue = INVOICE_STATUS_IMPORT_MAP[lowerTrimmed];
      return mappedValue || "Draft";
    }

    try {
      if (columnInfo.data_type === "ARRAY") {
        return trimmedValue.split(",").map((s) =>
          s.trim()
        ).filter((s) => s);
      }
      if (columnInfo.data_type === "jsonb") return JSON.parse(trimmedValue);
    } catch {
      console.warn(
        `Error al parsejar la cel·la per a la columna '${columnInfo.column_name}'. Valor: "${trimmedValue}".`,
      );
      return trimmedValue;
    }
    return trimmedValue;
  }
  if (cellValue instanceof Date) {
    if (columnInfo.data_type.startsWith("timestamp")) {
      return cellValue.toISOString();
    }
    if (columnInfo.data_type === "date") {
      return cellValue.toISOString().split("T")[0];
    }
  }
  return cellValue;
}

export function validateColumns(
  excelHeaders: string[], // Aquests ja estaran en anglès
  dbColumns: ColumnInfo[],
) {
  const dbColumnNamesLower = dbColumns.map((c) => c.column_name.toLowerCase());
  if (excelHeaders.length !== dbColumnNamesLower.length) {
    console.error(
      `La quantitat de columnes no coincideix. BDD: ${dbColumnNamesLower.length}, Fitxer: ${excelHeaders.length}.`,
    );
    console.error("Camps BDD esperats:", dbColumnNamesLower.join(", "));
    console.error("Camps fitxer (en anglès):", excelHeaders.join(", "));
    return false;
  }
  for (let i = 0; i < excelHeaders.length; i++) {
    if (dbColumnNamesLower[i] !== excelHeaders[i]) {
      console.error("L'ordre o els noms de les columnes no coincideixen.");
      console.error("Camps BDD esperats:", dbColumnNamesLower.join(", "));
      console.error("Camps fitxer (en anglès):", excelHeaders.join(", "));
      return false;
    }
  }
  return true;
}