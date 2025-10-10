"use server";
import { SupabaseClient } from "@supabase/supabase-js";
import { validateUserSession } from "@/lib/supabase/session";
import ExcelJS from 'exceljs';
import { getTranslations } from 'next-intl/server';

// --- TIPUS COMPARTITS ---
export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

export interface TableDataResult<T> {
  success: true;
  columns: ColumnInfo[];
  rows: T[];
}

export interface ErrorResponse {
  success: false;
  message: string;
}

// Defineix el tipus que representa una fila completa per a la inserció
type RowToInsert<T extends Record<string, unknown>> = T & {
  team_id: string;
  user_id: string;
};

/**
 * Funció per obtenir les metadades de les columnes d'una taula de Supabase.
 * Retorna l'array de columnes i el `selectString` per a la consulta.
 */
async function getTableColumns(supabase: SupabaseClient, tableName: string): Promise<{ columns: ColumnInfo[], selectString: string }> {
  const { data: columnInfo, error: columnError } = await supabase.rpc(
    "get_table_columns_info",
    { p_table_name: tableName }
  );

  if (columnError) {
    throw new Error(`Error obtenint columnes: ${columnError.message}`);
  }

  const columns = (columnInfo ?? []) as ColumnInfo[];
  const selectString = columns.map(c => c.column_name).join(",");

  return { columns, selectString };
}

/**
 * Funció per consultar dades d'una taula de Supabase, amb l'opció de no tornar-ne cap.
 */
async function getTableRecords<T>(supabase: SupabaseClient, tableName: string, activeTeamId: string, selectString: string, withData: boolean): Promise<T[]> {
  // Si withData és fals, retornem un array buit directament
  if (!withData) {
    return [];
  }

  const { data, error } = await supabase
    .from(tableName)
    .select(selectString)
    .eq('team_id', activeTeamId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`Error obtenint dades: ${error.message}`);
  }

  return (data ?? []) as T[];
}

// Tipus genèric per a la funció principal
export async function exportToExcel<T extends Record<string, unknown>>(tableName: string, withData: boolean) {
  try {
    const t = await getTranslations('excel');
    // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
    const session = await validateUserSession();
    if ('error' in session) {
      return { success: false, message: session.error.message };
    }
    const { supabase, activeTeamId } = session;

    // 2. Cridem a la funció per obtenir les columnes
    const { columns, selectString } = await getTableColumns(supabase, tableName);

    // 3. Cridem a la funció per obtenir els registres (o un array buit)
    const records = await getTableRecords<T>(supabase, tableName, activeTeamId, selectString, withData);

    // 4. Creem un nou llibre d'Excel i una pestanya
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(tableName);

    // 5. Definim les columnes de l'Excel a partir de la informació obtinguda
    const excelColumns = columns.map(col => ({
      header: col.column_name.charAt(0) + col.column_name.slice(1),
      key: col.column_name,
      width: 20,
    }));
    worksheet.columns = excelColumns;

    // 6. Afegim les dades a les files (pot ser un array buit si `withData` és `false`)
    if (records.length > 0) {
      worksheet.addRows(records);
    }

    // 7. Generem el fitxer Excel en memòria
    const buffer = await workbook.xlsx.writeBuffer();

    // 8. Retornem el buffer i el nom del fitxer
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    let fileName = "";
    if (withData) {
      fileName = `${tableName}_${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
    } else {
      fileName = `${t('template')}_${tableName}_${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
    }


    return {
      success: true,
      fileBuffer: Buffer.from(buffer).toString('base64'),
      fileName,
    };
  } catch (error) {
    console.error("Error en exportar a Excel:", error);
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}

// --- FUNCIONS PER IMPORTAR A EXCEL ---
export async function validateColumns(excelColumns: string[], dbColumns: ColumnInfo[]) {
  // Convertim els noms de les columnes de la BDD a minúscules per a la comparació
  const dbColumnNamesLower = dbColumns.map(c => c.column_name.toLowerCase());

  // Convertim els noms de les columnes de l'Excel a minúscules per a la comparació
  const excelColumnNamesLower = excelColumns.map(c => c.toLowerCase());

  // 1. Validar que la quantitat de columnes sigui la mateixa
  if (excelColumnNamesLower.length !== dbColumnNamesLower.length) {
    console.error(`La quantitat de columnes no coincideix. La BDD té ${dbColumnNamesLower.length} camps, mentre que l'arxiu té ${excelColumnNamesLower.length}.`);
    console.error("Camps BDD --> " + dbColumnNamesLower.join(", "));
    console.error("Camps fitxer --> " + excelColumnNamesLower.join(", "));
    return false;
  }

  // 2. Comprovar que cada columna de l'Excel coincideix amb la seva homòloga a la BD, respectant l'ordre i sense distinció de majúscules/minúscules
  for (let i = 0; i < excelColumnNamesLower.length; i++) {
    const dbColumnName = dbColumnNamesLower[i];
    const excelColumnName = excelColumnNamesLower[i];

    if (dbColumnName !== excelColumnName) {
      console.error("L'ordre o els noms de les columnes no coincideixen, o no s'han escrit de la mateixa manera (ignorant majúscules/minúscules).");
      console.error("Camps BDD --> " + dbColumnNamesLower.join(", "));
      console.error("Camps fitxer --> " + excelColumnNamesLower.join(", "));
      return false;
    }
  }

  // Si arriba aquí, vol dir que tot és correcte
  return true;
}

export async function importFromExcel<T extends Record<string, unknown>>(tableName: string, formData: FormData) {
  try {
    // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
    const session = await validateUserSession();
    if ('error' in session) {
      return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    // 2. Cridem a la funció per obtenir les columnes
    const { columns } = await getTableColumns(supabase, tableName);

    // 3. Obtenim el fitxer de FormData
    const file = formData.get('file');
    if (!file || typeof file === 'string' || !(file instanceof File)) {
      return { success: false, message: "No s'ha trobat el fitxer Excel." };
    }

    // 4. Convertim el ReadableStream a Buffer per a ExcelJS
    const buffer = await file.arrayBuffer();

    // 5. Llegim el fitxer Excel amb ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return { success: false, message: "No s'ha pogut llegir el full de càlcul." };
    }

    // 6. Obtenim les capçaleres de l'Excel i validem contra les columnes de la BD
    const excelHeaders = worksheet.getRow(1)?.values as string[];
    if (!excelHeaders || excelHeaders.length === 0) {
      return { success: false, message: "El full de càlcul no té capçaleres." };
    }
    excelHeaders.shift();

    if (!validateColumns(excelHeaders, columns)) {
      return { success: false, message: "Les columnes de l'arxiu Excel no coincideixen amb les de la base de dades." };
    }

    // 7. Processar les dades i preparar-les per a la inserció
    const dataToInsert: RowToInsert<T>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: Partial<T> = {};
      row.eachCell((cell, colNumber) => {
        const header = excelHeaders[colNumber - 1];
        if (header) {
          rowData[header as keyof Partial<T>] = cell.value as T[keyof T];
        }
      });

      // ✅ Creem un objecte que compleix amb el tipus RowToInsert
      const completeRow: RowToInsert<T> = {
        ...rowData,
        team_id: activeTeamId,
        user_id: user.id
      } as RowToInsert<T>; // Utilitzem l'asserció amb el tipus correcte

      dataToInsert.push(completeRow);
    });

    // 8. Inserir les dades a Supabase en lots
    const batchSize = 1000;
    let recordsInserted = 0;
    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);
      if (error) {
        console.error("Error en la inserció del lot:", error);
        return { success: false, message: `Error en la inserció de dades: ${error.message}` };
      }
      recordsInserted += batch.length;
    }

    return { success: true, message: `S'han importat ${recordsInserted} registres correctament.` };
  } catch (error) {
    console.error("Error en importar a Excel:", error);
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}
