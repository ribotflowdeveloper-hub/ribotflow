// @/app/[locale]/(app)/excel/excel.utils.ts (VERSIÓ CORREGIDA)
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
    "cancelat": "cancelled",
};

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
    "cancelat": "Cancelled",
};

/**
 * Converteix valors com 21 o "21,5" a 0.21 o 0.215.
 * Si el valor ja és 0.21, el retorna correctament.
 * Si el valor és buit o invàlid, retorna undefined.
 */
function parseTaxRate(value: unknown): number | undefined {
    let numericValue: number;

    if (typeof value === "number") {
        numericValue = value;
    } else if (typeof value === "string") {
        const trimmedValue = value.trim().replace(",", ".");
        if (trimmedValue === "") return undefined;
        numericValue = parseFloat(trimmedValue);
        if (isNaN(numericValue)) return undefined;
    } else {
        return undefined;
    }

    if (Math.abs(numericValue) > 1) {
        return numericValue / 100;
    }

    return numericValue;
}

// --- FUNCIONS DE VALIDACIÓ I PARSING ---
export function parseCellValue(
    cellValue: ExcelJS.CellValue,
    columnInfo: ColumnInfo | undefined,
    tableName: string,
): unknown {
    // 1. Si no tenim informació de la columna, no podem fer res.
    if (!columnInfo) {
        return undefined;
    }

    const isTextColumn = columnInfo.data_type.startsWith("text") ||
        columnInfo.data_type.startsWith("varchar");
    const isNumericColumn = columnInfo.data_type.startsWith("numeric");

    // 2. GESTIÓ DE CEL·LES REALMENT BUIDES (null o undefined)
    if (cellValue === null || cellValue === undefined) {
        // Si és text (quote_number), retornem '', ja que és NOT NULL sense DEFAULT
        if (isTextColumn) {
            return "";
        }
        // ✅ CORRECCIÓ: Si és numèric...
        if (isNumericColumn) {
            // Excepció: tax_rate volem que sigui undefined per activar el DEFAULT
            if (columnInfo.column_name.includes("tax_rate")) {
                return undefined;
            }
            // Per a 'subtotal', 'total_amount' etc., retornem 0
            return 0;
        }
        // Per a dates, etc., retornem undefined
        return undefined;
    }

    // 3. GESTIÓ DE TAX_RATE (primer, per ser un 'numeric' especial)
    if (
        columnInfo.column_name.includes("tax_rate") &&
        isNumericColumn
    ) {
        return parseTaxRate(cellValue);
    }

    // 4. GESTIÓ DE STRINGS (inclou cel·les amb "")
    if (typeof cellValue === "string") {
        const trimmedValue = cellValue.trim();

        // 4a. GESTIÓ DE STRINGS BUITS ("")
        if (trimmedValue === "") {
            // Mateixa lògica que al punt 2
            if (isTextColumn) {
                return "";
            }
            if (isNumericColumn) {
                if (columnInfo.column_name.includes("tax_rate")) {
                    return undefined;
                }
                return 0;
            }
            return undefined;
        }

        const lowerTrimmed = trimmedValue.toLowerCase();

        // 4b. GESTIÓ DE MAPES DE TRADUCCIÓ
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
        if (tableName === "invoices" && columnInfo.column_name === "status") {
            const mappedValue = INVOICE_STATUS_IMPORT_MAP[lowerTrimmed];
            return mappedValue || "Draft";
        }

        // 4c. GESTIÓ D'ARRAYS / JSON
        try {
            if (columnInfo.data_type === "ARRAY") {
                return trimmedValue.split(",").map((s) => s.trim()).filter((
                    s,
                ) => s);
            }
            if (columnInfo.data_type === "jsonb") {
                return JSON.parse(trimmedValue);
            }
        } catch {
            console.warn(
                `Error al parsejar la cel·la per a la columna '${columnInfo.column_name}'. Valor: "${trimmedValue}".`,
            );
            return trimmedValue;
        }
        return trimmedValue;
    }

    // 5. GESTIÓ DE DATES
    if (cellValue instanceof Date) {
        if (columnInfo.data_type.startsWith("timestamp")) {
            return cellValue.toISOString();
        }
        if (columnInfo.data_type === "date") {
            return cellValue.toISOString().split("T")[0];
        }
    }

    // 6. GESTIÓ D'ALTRES NÚMEROS (que no siguin tax_rate)
    if (typeof cellValue === "number") {
        return cellValue;
    }

    // 7. VALORS COMPLEXOS (Fórmules, etc.)
    if (typeof cellValue === "object") {
        if ("result" in cellValue && cellValue.result !== undefined) {
            return parseCellValue(
                cellValue.result as ExcelJS.CellValue,
                columnInfo,
                tableName,
            );
        }
        if ("text" in cellValue && cellValue.text) {
            return cellValue.text;
        }
    }

    // Si no és cap dels tipus gestionats, el retornem tal qual
    return cellValue;
}

export function validateColumns(
    excelHeaders: string[], // Aquests ja estaran en anglès
    dbColumns: ColumnInfo[],
) {
    const dbColumnNamesLower = dbColumns.map((c) =>
        c.column_name.toLowerCase()
    );
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
            console.error(
                "L'ordre o els noms de les columnes no coincideixen.",
            );
            console.error("Camps BDD esperats:", dbColumnNamesLower.join(", "));
            console.error("Camps fitxer (en anglès):", excelHeaders.join(", "));
            return false;
        }
    }
    return true;
}
