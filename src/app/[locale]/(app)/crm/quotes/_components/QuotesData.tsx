// /app/crm/quotes/_components/QuotesData.tsx


import { QuotesClient } from './QuotesClient';
import type { QuoteWithContact } from '../page';
import { validatePageSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció

export async function QuotesData({ searchParams }: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    try {
      // ✅ 2. Validació de sessió que gestiona les redireccions.
      const { supabase } = await validatePageSession();

      let query = supabase
          .from('quotes')
          .select('*, contacts(nom, empresa)');
        // ------------------------------------
        // ✅ MASTER FILTER: No longer needed! RLS will automatically filter by the active team.
        // query = query.eq('team_id', teamId); 
        
        // Dynamic filters and sorting logic remains the same.
        // ... (your existing for-loops for filters and sorting are fine)
        for (const key in searchParams) {
             const value = searchParams[key];
             if (value && typeof value === 'string') {
                 if (key === 'status') {
                     query = query.eq('status', value);
                 }
                 if (key === 'issue_date_from') {
                     query = query.gte('issue_date', value);
                 }
                 if (key === 'issue_date_to') {
                     query = query.lte('issue_date', value);
                 }
             }
         }

         let sortApplied = false;
         for (const key in searchParams) {
             if (key.startsWith('sortBy-')) {
                 const column = key.substring(7);
                 const order = searchParams[key] as string;

                 if (column && (order === 'asc' || order === 'desc')) {
                     sortApplied = true;
                     const ascending = order === 'asc';
                     if (column.includes('.')) {
                         const [referencedTable, referencedColumn] = column.split('.');
                         query = query.order(referencedColumn, { referencedTable, ascending });
                     } else {
                         query = query.order(column, { ascending });
                     }
                 }
             }
         }

        if (!sortApplied) {
            query = query.order('issue_date', { ascending: false });
        }

        const { data: quotes, error } = await query;
        if (error) throw error;

        return <QuotesClient initialQuotes={(quotes as QuoteWithContact[]) || []} />;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error loading quotes:", errorMessage);
        return <div className="p-8 text-center text-destructive">Error loading quotes.</div>;
    }
}