// src/app/[locale]/(app)/excel/create/actions.ts

'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getTables() {
    const supabase = createClient(cookies());

    // Obtenim totes les taules de l'esquema 'public'
    const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.error('Error fetching tables:', error);
        return { success: false, data: null, error: error.message };
    }

    // Retornem només els noms de les taules en un format més senzill
    const tableNames = tables.map(table => table.table_name);
    return { success: true, data: tableNames, error: null };
}

export async function getTableStructure(tableName: string) {
    const supabase = createClient(cookies());

    // Obtenim l'estructura de les columnes de la taula
    const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');

    if (error) {
        console.error('Error fetching table structure:', error);
        return { success: false, data: null, error: error.message };
    }

    // Retornem només els noms de les columnes
    const columnNames = columns.map(column => column.column_name);
    return { success: true, data: columnNames, error: null };
}