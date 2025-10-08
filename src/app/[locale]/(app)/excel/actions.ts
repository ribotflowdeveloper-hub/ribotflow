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
    const { supabase, user, activeTeamId } = session;

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
    const { columns, selectString } = await getTableColumns(supabase, tableName);

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














































// // --- FUNCIONS AUXILIARS DE FILE / TIME (MANTINGUDES) ---

// /**
//  * Funció auxiliar per obtenir el format de data i hora per al nom del fitxer.
//  */
// function getFormattedDateTime(): string {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, '0');
//   const day = String(now.getDate()).padStart(2, '0');
//   const hours = String(now.getHours()).padStart(2, '0');
//   const minutes = String(now.getMinutes()).padStart(2, '0');
//   const seconds = String(now.getSeconds()).padStart(2, '0');
//   return `${year}${month}${day}${hours}${minutes}${seconds}`;
// }

// /**
//  * Utilitat per extreure el valor simple d'un objecte de cel·la complexa (fórmules, valors rics).
//  * @param cellValue El valor de la cel·la retornat per ExcelJS.
//  * @returns El valor simple com a 'unknown'.
//  */
// function extractCellValue(cellValue: ExcelJS.CellValue | undefined): unknown {
//   if (typeof cellValue === 'object' && cellValue !== null) {
//     if ('result' in cellValue && cellValue.result !== undefined) {
//       return cellValue.result;
//     } else if ('value' in cellValue && cellValue.value !== undefined) {
//       return cellValue.value;
//     }
//     if (cellValue instanceof Date) {
//       return cellValue.toISOString();
//     }
//     return cellValue;
//   }
//   return cellValue;
// }

// /**
//  * Llegeix el fitxer Excel i retorna un array d'objectes.
//  */
// export async function readExcelFile(file: File): Promise<ExcelRecord[]> {
//   const workbook = new ExcelJS.Workbook();
//   const records: ExcelRecord[] = [];

//   const buffer = await file.arrayBuffer();
//   await workbook.xlsx.load(buffer);

//   const worksheet = workbook.worksheets[0];
//   if (!worksheet) {
//     throw new Error("El fitxer Excel no conté cap fulla de càlcul.");
//   }

//   const headerRow = worksheet.getRow(1);
//   const headerValues = headerRow?.values;

//   if (!headerValues || !Array.isArray(headerValues) || headerValues.length <= 1) {
//     console.warn("No s'han trobat capçaleres vàlides a la primera fila de l'Excel.");
//     return records;
//   }

//   const headers = headerValues.slice(1).map(cellValue => {
//     const rawValue = extractCellValue(cellValue);
//     const headerText = String(rawValue || '');
//     return headerText.toLowerCase().replace(/\s/g, '_');
//   }) as string[];

//   worksheet.eachRow((row, rowNumber) => {
//     if (rowNumber === 1) return;

//     const newRecord: ExcelRecord = {};
//     let isEmptyRow = true;
//     const rowValues = Array.isArray(row.values) ? row.values : [];

//     rowValues.slice(1).forEach((cellValue, index) => {
//       const key = headers[index];

//       if (key) {
//         const value = extractCellValue(cellValue);
//         if (value !== null && value !== undefined && String(value).trim() !== '') {
//           newRecord[key] = value;
//           isEmptyRow = false;
//         }
//       }
//     });

//     if (!isEmptyRow) {
//       records.push(newRecord);
//     }
//   });

//   return records;
// }

// /**
//  * Simula obtenir valors vàlids des de Supabase (per a desplegables) mitjançant el RPC.
//  */
// async function getValidValues(tableName: string, columnName: string): Promise<string[] | null> {
//   if (columnName.endsWith('_id')) {
//     // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
//     const session = await validateUserSession();
//     if ('error' in session) {
//       throw new Error(session.error.message);
//     }
//     const { supabase, user, activeTeamId } = session;

//     const refTableName = columnName.slice(0, -3);

//     try {
//       const { data, error } = await supabase.rpc('get_column_valid_values', {
//         p_ref_table_name: refTableName,
//         p_column_name: columnName
//       });

//       if (error) {
//         console.error(`Error obtenint valors vàlids per a ${columnName} (RPC): ${error.message}`);
//         return null;
//       }

//       return (data as { value: string }[]).map(item => String(item.value));

//     } catch (e) {
//       console.error("Error durant la crida a RPC de valors vàlids:", e);
//       return null;
//     }
//   }
//   return null;
// }

// // --- ACCIONS DE SUPABASE (MANTINGUDES) ---

// /**
//  * Obté dades o només metadades de columna d'una taula de Supabase.
//  */
// export async function getSupabaseTableData<T>(
//   tableName: string,
//   withData: boolean
// ): Promise<TableDataResult<T> | ErrorResponse> {
//   try {
//     // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
//     const session = await validateUserSession();
//     if ('error' in session) {
//       return { success: false, message: session.error.message };
//     }
//     const { supabase, user, activeTeamId } = session;

//     const { data: columnInfo, error: columnError } = await supabase.rpc(
//       "get_table_columns_info",
//       { p_table_name: tableName }
//     );

//     if (columnError) {
//       throw new Error(`Error obtenint columnes: ${columnError.message}`);
//     }

//     const columns = (columnInfo ?? []) as ColumnInfo[];

//     if (!withData) {
//       return { success: true, columns, rows: [] };
//     }

//     const selectString = columns.map(c => c.column_name).join(",");

//     const { data, error } = await supabase
//       .from(tableName)
//       .select(selectString)
//       .eq('team_id', activeTeamId)
//       .order("created_at", { ascending: false })
//       .limit(1000);

//     if (error) {
//       throw new Error(`Error obtenint dades: ${error.message}`);
//     }

//     return {
//       success: true,
//       columns,
//       rows: (data ?? []) as T[],
//     };
//   } catch (err) {
//     const message = err instanceof Error ? err.message : "Error desconegut";
//     return { success: false, message };
//   }
// }

// // --- TIPUS AUXILIAR CORREGIT ---
// type SimpleColumnDefinition = {
//   header: string;
//   key: string;
//   width: number;
//   numFmt?: string;
//   validList?: string[] | null;
// };

// // Fusionem DataValidation per incloure 'ranges' (o 'sqref', si el teu ExcelJS és més antic)
// type DataValidationConfig = ExcelJS.DataValidation & {
//   ranges: string[];
// };

// // 🚨 TIPUS PER LA WORKSHEET: L'única manera de solucionar l'error a la línia 309 sense 'any'
// // és assegurar-nos que el tipus de la Worksheet conté 'dataValidations' amb un mètode 'add'.
// type WorksheetWithValidations = ExcelJS.Worksheet & {
//   dataValidations: {
//     add: (options: DataValidationConfig) => void;
//   }
// };


// /**
//  * Crea un buffer d'Excel (base64) a partir d'un array de dades o només de la definició de la columna.
//  */
// export async function createExcelFromData<T extends object>(
//   data: T[],
//   tableName: string
// ): Promise<string> {
//   const workbook = new ExcelJS.Workbook();

//   // 🚨 CORRECCIÓ CLAU: Creem la worksheet i fem casting al nostre tipus estès
//   const worksheet = workbook.addWorksheet(tableName) as WorksheetWithValidations;
//   let simpleColumnDefs: SimpleColumnDefinition[] = [];

//   // 1. Obtenim les definicions de columnes (amb dades o sense)
//   if (data && data.length > 0) {
//     const columnKeys = Object.keys(data[0]);
//     simpleColumnDefs = columnKeys.map(key => ({
//       header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
//       key: key,
//       width: 20,
//     }));
//   } else {
//     // BLOC PLANTILLA: Aplicant Format i Validació
//     // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
//     const session = await validateUserSession();
//     if ('error' in session) {
//       throw new Error(session.error.message);
//     }
//     const { supabase, user, activeTeamId } = session;

//     const { data: columnInfo, error: columnError } = await supabase
//       .rpc('get_table_columns_info', { p_table_name: tableName });

//     if (columnError) {
//       throw new Error(`Error en obtenir les metadades de les columnes: ${columnError.message}`);
//     }

//     const finalColumnInfo = (columnInfo ?? []) as ColumnInfo[];

//     const columnPromises = finalColumnInfo.map(async item => {
//       const columnName = item.column_name;

//       if (typeof columnName !== 'string' || columnName.length === 0) {
//         return null;
//       }

//       const def: SimpleColumnDefinition = {
//         header: columnName.charAt(0).toUpperCase() + columnName.slice(1).replace(/_/g, ' '),
//         key: columnName,
//         width: 20,
//       };

//       // 1. FORMAT DE CEL·LES
//       if (item.data_type.includes('timestamp') || item.data_type.includes('date')) {
//         def.numFmt = 'yyyy-mm-dd hh:mm:ss';
//       } else if (item.data_type === 'integer' || item.data_type.includes('int')) {
//         def.numFmt = '0';
//       } else if (item.data_type === 'double precision' || item.data_type.includes('numeric') || item.data_type.includes('float')) {
//         def.numFmt = '0.00';
//       }

//       // 2. OBTENIR VALORS PER A LA VALIDACIÓ DE DADES
//       def.validList = await getValidValues(tableName, columnName);

//       return def;
//     });

//     simpleColumnDefs = (await Promise.all(columnPromises)).filter((item): item is SimpleColumnDefinition => item !== null);
//   }

//   // 2. CONVERTIM i DEFINIM les columnes d'Excel
//   const columns: ExcelJS.Column[] = simpleColumnDefs.map(def => ({
//     header: def.header,
//     key: def.key,
//     width: def.width,
//     style: def.numFmt ? { numFmt: def.numFmt } as ExcelJS.Style : undefined,
//   })) as ExcelJS.Column[];

//   worksheet.columns = columns;

//   // 3. AFEGIM LES DADES (SI N'HI HA)
//   if (data && data.length > 0) {
//     worksheet.addRows(data);
//   }

//   // 4. APLIQUEM LA VALIDACIÓ DE DADES (DESPLEGABLES)
//   simpleColumnDefs.forEach((def, index) => {
//     const columnNumber = index + 1;
//     const validList = def.validList;

//     if (validList && validList.length > 0) {
//       const formulaContent = validList.map(v => `"${v}"`).join(',');

//       if (formulaContent.length <= 250) {

//         // El mètode 'add' de 'dataValidations' ara accepta DataValidationConfig sense error de tipus
//         worksheet.dataValidations.add({
//           ranges: [`${encodeColumn(columnNumber)}2:${encodeColumn(columnNumber)}1000`],
//           type: 'list',
//           allowBlank: true,
//           showErrorMessage: true,
//           formulae: [`"${formulaContent}"`],
//           errorStyle: 'stop',
//           error: 'El valor introduit no és vàlid. Selecciona un valor de la llista desplegable.',
//         } as DataValidationConfig); // 🚨 CASTING FINAL A DataValidationConfig per a rangs
//       } else {
//         console.warn(`Llista de valors massa llarga per a la columna ${def.key}. S'ignora la validació directa.`);
//       }
//     }
//   });
//   // 5. Generem el buffer i el retornem en base64
//   const buffer = await workbook.xlsx.writeBuffer();
//   return Buffer.from(buffer as unknown as Buffer).toString('base64');
// }

// /**
//  * Funció local per codificar un número de columna (1-base) al seu nom de lletra (A, B, AA).
//  * Substitueix l'ús de qualsevol forma de ExcelJS.utils.encodeColumn per evitar errors de tipatge.
//  */
// function encodeColumn(i: number): string {
//   let result = '';
//   while (i > 0) {
//     const remainder = i % 26;
//     if (remainder === 0) {
//       result = 'Z' + result;
//       i = Math.floor(i / 26) - 1;
//     } else {
//       result = String.fromCharCode((remainder - 1) + 'A'.charCodeAt(0)) + result;
//       i = Math.floor(i / 26);
//     }
//   }
//   return result;
// }

// /**
//  * Funció principal per exportar a Excel.
//  */
// export async function exportToExcel(
//   withData: boolean,
//   tableName: string
// ): Promise<{ success: boolean; fileBuffer?: string; fileName?: string; message?: string }> {
//   try {
//     const tableData = await getSupabaseTableData<Record<string, unknown>>(tableName, withData);

//     if (!tableData.success) {
//       throw new Error(tableData.message);
//     }

//     const fileBuffer = await createExcelFromData(tableData.rows, tableName);

//     const dateTimeSuffix = getFormattedDateTime();
//     let fileName: string;

//     if (withData) {
//       fileName = `${tableName}_${dateTimeSuffix}.xlsx`;
//     } else {
//       fileName = `Plantilla_${tableName}_${dateTimeSuffix}.xlsx`;
//     }

//     return {
//       success: true,
//       fileBuffer,
//       fileName,
//     };
//   } catch (error) {
//     console.error("Error en exportar a Excel:", error);
//     const message = error instanceof Error ? error.message : "Error desconegut";
//     return { success: false, message };
//   }
// }


// export async function exportToExcel2(tableName: string, withData: boolean) {
//   try {
//     // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
//     const session = await validateUserSession();
//     if ('error' in session) {
//       return { success: false, message: session.error.message };
//     }
//     const { supabase, user, activeTeamId } = session;

//     const { data: columnInfo, error: columnError } = await supabase.rpc(
//       "get_table_columns_info",
//       { p_table_name: tableName }
//     );

//     if (columnError) {
//       throw new Error(`Error obtenint columnes: ${columnError.message}`);
//     }

//     const columns = (columnInfo ?? []) as ColumnInfo[];

//     const selectString = columns.map(c => c.column_name).join(",");

//     // 2. Definir una variable per emmagatzemar les dades
//     let contacts: Contact[] = [];

//     // 3. Condició per a obtenir les dades si withData és true
//     if (withData) {
//       const { data, error } = await supabase
//         .from(tableName)
//         .select(selectString)
//         .filter('team_id', 'eq', activeTeamId)
//         .order('created_at', { ascending: false });

//       if (error) {
//         throw new Error(`Error en obtenir les dades: ${error.message}`);
//       }
//       da = data as Contact[];
//     }

//     // 4. Creem un nou llibre d'Excel i una pestanya
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet(tableName);

//     // 5. Definim les columnes de l'Excel
//     worksheet.columns = [
//       { header: 'ID', key: 'id', width: 10 },
//       { header: 'Nom', key: 'nom', width: 30 },
//       { header: 'Email', key: 'email', width: 30 },
//       { header: 'Data de Creació', key: 'created_at', width: 20 },
//       { header: 'Empresa', key: 'empresa', width: 20 },
//     ];

//     // 6. Afegim les dades a les files només si withData és true
//     if (withData) {
//       worksheet.addRows(contacts);
//     }

//     // 7. Generem el fitxer Excel en memòria
//     const buffer = await workbook.xlsx.writeBuffer();

//     // 8. Retornem el buffer i el nom del fitxer
//     const now = new Date();
//     const pad = (num: number) => num.toString().padStart(2, '0');
//     const fileName = `${tableName}_${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;

//     return {
//       success: true,
//       fileBuffer: Buffer.from(buffer).toString('base64'),
//       fileName,
//     };

//   } catch (error) {
//     console.error("Error en exportar a Excel:", error);
//     const message = error instanceof Error ? error.message : "Error desconegut";
//     return { success: false, message };
//   }
// }






