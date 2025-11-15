// @/app/[locale]/(app)/excel/excel.db.ts
import { type SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { type ColumnInfo } from "./excel.config";

export async function getTableColumns(
    supabase: SupabaseClient,
    tableName: string,
): Promise<{ columns: ColumnInfo[] }> {
    const { data: columnInfo, error: columnError } = await supabase.rpc(
        "get_table_columns_info",
        { p_table_name: tableName },
    );
    if (columnError) {
        throw new Error(`Error obtenint columnes: ${columnError.message}`);
    }
    return { columns: (columnInfo ?? []) as ColumnInfo[] };
}

export async function getTableRecords<T>(
    supabase: SupabaseClient,
    tableName: string,
    activeTeamId: string,
    selectString: string,
    withData: boolean,
): Promise<T[]> {
    if (!withData || !selectString) return [];
    const { data, error } = await supabase
        .from(tableName)
        .select(selectString)
        .eq("team_id", activeTeamId)
        .order("created_at", { ascending: false })
        .limit(1000);
    if (error) throw new Error(`Error obtenint dades: ${error.message}`);
    return (data ?? []) as T[];
}

export async function getTranslatedHeaders(
    tableName: string,
    allDbColumns: ColumnInfo[],
) {
    const t_cols = await getTranslations("ExcelColumns");
    const englishToTranslated = new Map<string, string>();
    const translatedToEnglish = new Map<string, string>();

    allDbColumns.forEach((col) => {
        const key = `${tableName}.${col.column_name}`;
        let translatedHeader = t_cols(key);

        if (translatedHeader === `ExcelColumns.${key}`) {
            translatedHeader = col.column_name;
        }

        englishToTranslated.set(col.column_name, translatedHeader);

        // Fixa’t aquí ↓↓ — ara sí que és correcte
        translatedToEnglish.set(translatedHeader, col.column_name);
    });

    return { englishToTranslated, translatedToEnglish };
}
