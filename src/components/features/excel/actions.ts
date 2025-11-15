// @/app/[locale]/(app)/excel/actions.ts (VERSIÓ CORREGIDA)
"use server";

import { validateUserSession } from "@/lib/supabase/session";
import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { Readable } from "stream";
import { revalidatePath } from "next/cache";

import { getUsageLimitStatus } from "@/lib/subscription/subscription";
import { Infinity } from "@/lib/utils/utils";
import {
    type ColumnInfo,
    resourceKeyMap,
    type RowToInsert,
    TEMPLATE_CONFIG,
} from "./excel.config";
import {
    getTableColumns,
    getTableRecords,
    getTranslatedHeaders,
} from "./excel.db";
import { parseCellValue, validateColumns } from "./excel.utils";

// --- EXPORTAR A EXCEL (Aquesta funció és CORRECTA) ---
export async function exportToExcel<T extends Record<string, unknown>>(
    tableName: string,
    withData: boolean,
) {
    try {
        const t = await getTranslations("excel");
        const session = await validateUserSession();
        if ("error" in session) {
            return { success: false, message: session.error.message };
        }
        const { supabase, activeTeamId } = session;

        // 1. Obtenir TOTES les columnes de la BBDD
        const { columns: allColumns } = await getTableColumns(
            supabase,
            tableName,
        );

        // 2. Obtenir la configuració
        const config = TEMPLATE_CONFIG[tableName];

        // 3. Determinar les columnes a exportar ABANS de traduir
        const baseExclude = ["id", "user_id", "team_id"];
        const templateExclude = (!withData && config?.excludeColumns)
            ? config.excludeColumns
            : [];

        const exportableColumns = allColumns.filter((col) => {
            return !baseExclude.includes(col.column_name) &&
                !templateExclude.includes(col.column_name);
        });

        // 4. Traduïm NOMÉS les columnes que exportarem
        const { englishToTranslated } = await getTranslatedHeaders(
            tableName,
            exportableColumns, // Passem la llista filtrada
        );

        // 5. Obtenir les dades (Lògica de BBDD)
        const selectString = exportableColumns.map((c) => c.column_name).join(
            ",",
        );
        const records = await getTableRecords<T>(
            supabase,
            tableName,
            activeTeamId,
            selectString,
            withData,
        );

        // 6. Construir l'Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(tableName);

        const excelColumns = exportableColumns.map((col) => {
            const translatedHeader = englishToTranslated.get(col.column_name) ||
                col.column_name;
            return {
                header: translatedHeader,
                key: col.column_name,
                width: translatedHeader.length > 20
                    ? translatedHeader.length + 2
                    : 20,
            };
        });
        worksheet.columns = excelColumns;
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEEEEEE" },
        };

        // 7. Aplicar validacions i fila d'exemple (si és plantilla)
        if (!withData) {
            if (config?.validations) {
                exportableColumns.forEach((col, index) => {
                    const validationList = config.validations[col.column_name];
                    if (validationList) {
                        const formula = `"${validationList.join(",")}"`;
                        for (let i = 2; i < 1002; i++) {
                            worksheet.getCell(i, index + 1).dataValidation = {
                                type: "list",
                                allowBlank: true,
                                formulae: [formula],
                                showErrorMessage: true,
                                errorTitle: t("errors.validationTitle"),
                                error: t("errors.validationMessage", {
                                    values: validationList.join(", "),
                                }),
                            };
                        }
                    }
                });
            }

            if (config?.exampleRow) {
                const rowToAdd = exportableColumns.map((col) =>
                    config.exampleRow[col.column_name] || null
                );
                const exampleRow = worksheet.getRow(2);
                exampleRow.values = rowToAdd;
                exampleRow.font = { italic: true, color: { argb: "FF666666" } };
            }
        } else if (records.length > 0) {
            worksheet.addRows(records);
        }

        // 8. Creació del buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const now = new Date();
        const pad = (num: number) => num.toString().padStart(2, "0");
        const dateStamp = `${now.getFullYear().toString().slice(-2)}${
            pad(now.getMonth() + 1)
        }${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${
            pad(now.getSeconds())
        }`;
        let fileName = "";
        if (withData) {
            fileName = `${tableName}_${dateStamp}.xlsx`;
        } else {
            fileName = `${t("template")}_${tableName}_${dateStamp}.xlsx`;
        }

        return {
            success: true,
            fileBuffer: Buffer.from(buffer).toString("base64"),
            fileName,
        };
    } catch (error) {
        console.error("Error en exportar a Excel:", error);
        const message = error instanceof Error
            ? error.message
            : "Error desconegut";
        return { success: false, message };
    }
}

// --- IMPORTAR DES DE EXCEL (AQUÍ ESTAVA L'ERROR) ---
export async function importFromExcel<T extends Record<string, unknown>>(
    tableName: string,
    formData: FormData,
) {
    try {
        const t_excel = await getTranslations("excel");
        const session = await validateUserSession();
        if ("error" in session) {
            return { success: false, message: session.error.message };
        }
        const { supabase, user, activeTeamId } = session;

        // 1. Obtenir TOTES les columnes de la BBDD
        const { columns: allDbColumns } = await getTableColumns(
            supabase,
            tableName,
        );

        // 2. ✅ AQUESTA ÉS LA CORRECCIÓ:
        // Obtenim el mapa de traduccions per A TOTES les columnes primer.
        const { translatedToEnglish } = await getTranslatedHeaders(
            tableName,
            allDbColumns, // Passem la llista COMPLETA
        );

        const columnTypeMap = new Map<string, ColumnInfo>();
        allDbColumns.forEach((c) => columnTypeMap.set(c.column_name, c));

        // 3. Definir columnes esperades (Config)
        // (Això ara passa DESPRÉS de crear el mapa de traduccions)
        const config = TEMPLATE_CONFIG[tableName];
        const baseExclude = ["id", "user_id", "team_id"];
        const templateExclude = config?.excludeColumns || [];
        const expectedColumns = allDbColumns.filter((c) =>
            !baseExclude.includes(c.column_name) &&
            !templateExclude.includes(c.column_name)
        );

        // 4. Llegir fitxer
        const file = formData.get("file");
        if (!file || typeof file === "string" || !(file instanceof File)) {
            return { success: false, message: t_excel("errors.noFile") };
        }
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        try {
            if (file.type === "text/csv" || file.name.endsWith(".csv")) {
                const stream = Readable.from(Buffer.from(buffer));
                await workbook.csv.read(stream);
            } else if (
                file.type ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                file.name.endsWith(".xlsx")
            ) {
                await workbook.xlsx.load(buffer);
            } else {
                return {
                    success: false,
                    message: t_excel("errors.unsupportedFormat"),
                };
            }
        } catch (readError) {
            console.error("Error llegint el fitxer Excel/CSV:", readError);
            return { success: false, message: t_excel("errors.fileReadError") };
        }

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            return { success: false, message: t_excel("errors.noSheet") };
        }

        // 5. Validar capçaleres (Utils)
        const excelHeadersRow = worksheet.getRow(1);
        if (!excelHeadersRow) {
            return { success: false, message: t_excel("errors.emptySheet") };
        }

        const translatedHeaders: string[] = [];
        excelHeadersRow.eachCell({ includeEmpty: false }, (cell) => {
            if (cell.value) {
                translatedHeaders.push(cell.value.toString().trim());
            }
        });

        // Ara el 'translatedToEnglish' és complet i trobarà "Estat", "Data d'Emissió", etc.
        const englishHeaders = translatedHeaders.map((h) =>
            translatedToEnglish.get(h) || h.toLowerCase().replace(/ /g, "_")
        );

        if (!validateColumns(englishHeaders, expectedColumns)) {
            return {
                success: false,
                message: t_excel("errors.columnMismatch"),
            };
        }

        // 6. Processar files (Utils)
        const dataToInsert: RowToInsert<T>[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Salta capçalera

            const rowData: Partial<T> = {};
            expectedColumns.forEach((colInfo, index) => {
                const cell = row.getCell(index + 1);
                const columnInfo = columnTypeMap.get(colInfo.column_name);
                const parsedValue: unknown = parseCellValue(
                    cell.value,
                    columnInfo,
                    tableName,
                );

                if (parsedValue !== null && parsedValue !== undefined) {
                    rowData[colInfo.column_name as keyof Partial<T>] =
                        parsedValue as T[keyof T];
                }
            });

            if (Object.keys(rowData).length === 0) return;

            const completeRow: RowToInsert<T> = {
                ...rowData,
                team_id: activeTeamId,
                user_id: user.id,
            } as RowToInsert<T>;
            dataToInsert.push(completeRow);
        });

        if (dataToInsert.length === 0) {
            return { success: false, message: t_excel("errors.noData") };
        }

        // 7. Validació de Límits (Config)
        const t_billing = await getTranslations("Billing");
        const resourceKey = resourceKeyMap[tableName];
        if (resourceKey) {
            const limitCheck = await getUsageLimitStatus(resourceKey);
            if (limitCheck.max !== Infinity) {
                const availableQuota = limitCheck.max - limitCheck.current;
                if (dataToInsert.length > availableQuota) {
                    const message = t_billing("importLimitExceeded", {
                        newRecordsCount: dataToInsert.length,
                        availableQuota: availableQuota > 0 ? availableQuota : 0,
                        planLimit: limitCheck.max,
                        currentCount: limitCheck.current,
                    });
                    return { success: false, message: message };
                }
            }
        }

        // 8. Inserir a BBDD
        const batchSize = 500;
        let recordsInserted = 0;
        for (let i = 0; i < dataToInsert.length; i += batchSize) {
            const batch = dataToInsert.slice(i, i + batchSize);
            const { error } = await supabase.from(tableName).insert(batch);
            if (error) {
                console.error("Error en la inserció del lot:", error);
                return {
                    success: false,
                    message: `${
                        t_excel("errors.insertError")
                    }: ${error.message}`,
                };
            }
            recordsInserted += batch.length;
        }

        // 9. Revalidació
        const pathMap: { [key: string]: string } = {
            contacts: "/[locale]/crm/contactes",
            products: "/[locale]/finances/products",
            quotes: "/[locale]/finances/quotes",
            invoices: "/[locale]/finances/invoices",
            expenses: "/[locale]/finances/expenses",
            suppliers: "/[locale]/finances/suppliers",
        };
        const revalidatePathString = pathMap[tableName];
        if (revalidatePathString) {
            revalidatePath(revalidatePathString, "layout");
        }

        return {
            success: true,
            message: t_excel("successImport", { count: recordsInserted }),
        };
    } catch (error) {
        console.error("Error en importar a Excel:", error);
        const message = error instanceof Error
            ? error.message
            : "Error desconegut";
        return { success: false, message };
    }
}
