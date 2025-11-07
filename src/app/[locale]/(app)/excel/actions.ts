// @/app/[locale]/(app)/excel/actions.ts
"use server";
import { SupabaseClient } from "@supabase/supabase-js";
import { validateUserSession } from "@/lib/supabase/session";
import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { Readable } from "stream";
import { revalidatePath } from "next/cache";

// --- TIPUS COMPARTITS ---
export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

// ... (TableDataResult i ErrorResponse es queden igual) ...

type RowToInsert<T extends Record<string, unknown>> = T & {
  team_id: string;
  user_id: string;
};

// ... (getTableColumns i getTableRecords es queden igual) ...
async function getTableColumns(
  supabase: SupabaseClient,
  tableName: string,
): Promise<{ columns: ColumnInfo[]; selectString: string }> {
  const { data: columnInfo, error: columnError } = await supabase.rpc(
    "get_table_columns_info",
    { p_table_name: tableName },
  );

  if (columnError) {
    throw new Error(`Error obtenint columnes: ${columnError.message}`);
  }

  const columns = (columnInfo ?? []) as ColumnInfo[];

  const exportableColumns = columns.filter((c) =>
    c.column_name !== "id" &&
    c.column_name !== "user_id" &&
    c.column_name !== "team_id"
  );

  const selectString = exportableColumns.map((c) => c.column_name).join(",");

  return { columns: exportableColumns, selectString };
}

async function getTableRecords<T>(
  supabase: SupabaseClient,
  tableName: string,
  activeTeamId: string,
  selectString: string,
  withData: boolean,
): Promise<T[]> {
  if (!withData || !selectString) {
    return [];
  }

  const { data, error } = await supabase
    .from(tableName)
    .select(selectString)
    .eq("team_id", activeTeamId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Error obtenint dades: ${error.message}`);
  }

  return (data ?? []) as T[];
}


// ... (exportToExcel es queda igual) ...
export async function exportToExcel<T extends Record<string, unknown>>(
  tableName: string,
  withData: boolean,
) {
  try {
    const t = await getTranslations("excel");
    // 1. Validació de la sessió
    const session = await validateUserSession();
    if ("error" in session) {
      return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    // 2. Obtenir les columnes (només les exportables)
    const { columns, selectString } = await getTableColumns(
      supabase,
      tableName,
    );

    // 3. Obtenir els registres
    const records = await getTableRecords<T>(
      supabase,
      tableName,
      activeTeamId,
      selectString,
      withData,
    );

    // 4. Crear llibre d'Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(tableName);

    // 5. Definir les columnes (basat en les columnes exportables)
    const excelColumns = columns.map((col) => ({
      header: col.column_name,
      key: col.column_name,
      width: 20,
    }));
    worksheet.columns = excelColumns;

    // 6. Afegir les dades
    if (records.length > 0) {
      worksheet.addRows(records);
    }

    // 7. Generar el buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 8. Retornar el buffer
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, "0");
    let fileName = "";
    if (withData) {
      fileName = `${tableName}_${now.getFullYear().toString().slice(-2)}${
        pad(now.getMonth() + 1)
      }${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${
        pad(now.getSeconds())
      }.xlsx`;
    } else {
      fileName = `${t("template")}_${tableName}_${
        now.getFullYear().toString().slice(-2)
      }${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${
        pad(now.getMinutes())
      }${pad(now.getSeconds())}.xlsx`;
    }

    return {
      success: true,
      fileBuffer: Buffer.from(buffer).toString("base64"),
      fileName,
    };
  } catch (error) {
    console.error("Error en exportar a Excel:", error);
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

// ... (validateColumns es queda igual) ...
export async function validateColumns(
  excelColumns: string[],
  dbColumns: ColumnInfo[],
) {
  const dbColumnNamesLower = dbColumns.map((c) => c.column_name.toLowerCase());
  const excelColumnNamesLower = excelColumns.map((c) => c.toLowerCase());

  if (excelColumnNamesLower.length !== dbColumnNamesLower.length) {
    console.error(
      `La quantitat de columnes no coincideix. BDD: ${dbColumnNamesLower.length}, Fitxer: ${excelColumnNamesLower.length}.`,
    );
    console.error("Camps BDD:", dbColumnNamesLower.join(", "));
    console.error("Camps fitxer:", excelColumnNamesLower.join(", "));
    return false;
  }

  for (let i = 0; i < excelColumnNamesLower.length; i++) {
    if (dbColumnNamesLower[i] !== excelColumnNamesLower[i]) {
      console.error("L'ordre o els noms de les columnes no coincideixen.");
      console.error("Camps BDD:", dbColumnNamesLower.join(", "));
      console.error("Camps fitxer:", excelColumnNamesLower.join(", "));
      return false;
    }
  }
  return true;
}


// 💡 AFEGIT: Mapa de transformació per als estats
const statusMap: { [key: string]: string } = {
  'client': 'C',
  'lead': 'L',
  'proveïdor': 'P',
  'actiu': 'A',
  'inactiu': 'I',
  'perdut': 'X',
  // Afegim també els codis per si l'usuari no canvia res
  'c': 'C',
  'l': 'L',
  'p': 'P',
  'a': 'A',
  'i': 'I',
  'x': 'X',
};

function parseCellValue(
  cellValue: ExcelJS.CellValue,
  columnInfo: ColumnInfo | undefined,
): unknown {
  if (!columnInfo || cellValue === null || cellValue === undefined) {
    return cellValue;
  }

  if (typeof cellValue === "string") {
    const trimmedValue = cellValue.trim();
    if (trimmedValue === "") {
      return null; // Retornem null per a strings buides
    }

    // 💡💡💡 INICI DE LA CORRECCIÓ 2 (Estat) 💡💡💡
    // Transformem la columna 'estat'
    if (columnInfo.column_name === 'estat') {
      const normalizedValue = trimmedValue.toLowerCase();
      const mappedValue = statusMap[normalizedValue];
      if (mappedValue) {
        return mappedValue; // Retorna 'C', 'L', 'P', etc.
      }
      // Si no troba map, retorna el valor original (potser és un codi)
      return trimmedValue.toUpperCase();
    }
    // 💡💡💡 FI DE LA CORRECCIÓ 2 (Estat) 💡💡💡

    try {
      if (columnInfo.data_type === "ARRAY") {
        return trimmedValue.split(",").map((s) => s.trim()).filter((s) => s);
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
    
    return trimmedValue; // Retorna la string normal si no és cap tipus especial
  }

  if (cellValue instanceof Date) {
    if (columnInfo.data_type.startsWith("timestamp")) {
      return cellValue.toISOString();
    }
    if (columnInfo.data_type === "date") {
      return cellValue.toISOString().split("T")[0];
    }
  }
  
  // Per a números, booleans, etc.
  return cellValue;
}

export async function importFromExcel<T extends Record<string, unknown>>(
  tableName: string,
  formData: FormData,
) {
  try {
    // 1. Validació de la sessió
    const session = await validateUserSession();
    if ("error" in session) {
      return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    // 2. Obtenim TOTES les columnes de la BBDD per mapejar tipus
    const { data: allDbColumns, error: columnError } = await supabase.rpc(
      "get_table_columns_info",
      { p_table_name: tableName },
    );
    if (columnError) throw new Error(columnError.message);

    const columnTypeMap = new Map<string, ColumnInfo>();
    (allDbColumns as ColumnInfo[]).forEach((c) =>
      columnTypeMap.set(c.column_name, c)
    );

    const expectedColumns = (allDbColumns as ColumnInfo[]).filter((c) =>
      c.column_name !== "id" &&
      c.column_name !== "user_id" &&
      c.column_name !== "team_id"
    );

    // 3. Obtenir el fitxer
    const file = formData.get("file");
    if (!file || typeof file === "string" || !(file instanceof File)) {
      return { success: false, message: "No s'ha trobat el fitxer." };
    }

    // 4. Convertir a Buffer (ArrayBuffer)
    const buffer = await file.arrayBuffer();

    // 5. Llegim el fitxer
    const workbook = new ExcelJS.Workbook();

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      const nodeBuffer = Buffer.from(buffer); 
      const stream = Readable.from(nodeBuffer);
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
        message: "Format de fitxer no suportat. Puja un .xlsx o .csv",
      };
    }

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return {
        success: false,
        message: "No s'ha pogut llegir el full de càlcul.",
      };
    }

    // 6. Validar capçaleres
    const excelHeadersRow = worksheet.getRow(1);
    if (!excelHeadersRow) {
      return { success: false, message: "El full de càlcul és buit." };
    }

    const excelHeaders: string[] = [];
    excelHeadersRow.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value) {
        excelHeaders.push(cell.value.toString().trim().toLowerCase());
      }
    });

    if (!validateColumns(excelHeaders, expectedColumns)) {
      return {
        success: false,
        message:
          "Les columnes de l'arxiu no coincideixen amb la plantilla. Descarrega la plantilla de nou.",
      };
    }

    // 7. Processar les dades
    const dataToInsert: RowToInsert<T>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltem la capçalera

      const rowData: Partial<T> = {};

      expectedColumns.forEach((colInfo, index) => {
        const cell = row.getCell(index + 1); 

        const columnInfo = columnTypeMap.get(colInfo.column_name);
        const parsedValue: unknown = parseCellValue(cell.value, columnInfo);

        // Ara comparem amb 'null' enlloc de '""'
        if (parsedValue !== null && parsedValue !== undefined) {
          rowData[colInfo.column_name as keyof Partial<T>] =
            parsedValue as T[keyof T];
        }
      });

      // Afegim les dades d'equip i usuari
      const completeRow: RowToInsert<T> = {
        ...rowData,
        team_id: activeTeamId,
        user_id: user.id,
      } as RowToInsert<T>;

      dataToInsert.push(completeRow);
    });

    if (dataToInsert.length === 0) {
      return {
        success: false,
        message: "El fitxer no conté dades per importar.",
      };
    }

    // 8. Inserir les dades a Supabase en lots
    const batchSize = 500;
    let recordsInserted = 0;
    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);
      if (error) {
        console.error("Error en la inserció del lot:", error);
        return {
          success: false,
          message: `Error en la inserció de dades: ${error.message}`,
        };
      }
      recordsInserted += batch.length;
    }
    
    // Invalidem la cau (ja ho tenies, està perfecte)
    if (tableName === "contacts") {
      revalidatePath("/crm/contactes");
    }
    return {
      success: true,
      message: `S'han importat ${recordsInserted} registres correctament.`,
    };
  } catch (error) {
    console.error("Error en importar a Excel:", error);
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}