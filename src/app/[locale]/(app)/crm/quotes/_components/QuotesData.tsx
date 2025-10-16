// /app/crm/quotes/_components/QuotesData.tsx

import { QuotesClient } from './QuotesClient';
import type { QuoteWithContact, QuotesSearchParams } from '../page';
import { validatePageSession } from "@/lib/supabase/session"; 
// ❌ Eliminem l'import de PostgrestResponse i la definició de QuotesResult
// ja que no són necessaris amb la nova estructura.

// -------------------------------------------------------------
// ✅ NOU TIPATGE D'ARGUMENTS DE LA FUNCIÓ
// -------------------------------------------------------------
export async function QuotesData({ searchParams }: {
    searchParams: QuotesSearchParams;
}) {
    // ❌ Eliminem la definició de 'QuotesResult' ja que no s'utilitza.

    try {
      const { supabase } = await validatePageSession();
      
      // -------------------------------------------------------------
      // ✅ INICI DE LA CONSULTA (Manté la capacitat d'afegir filtres)
      // -------------------------------------------------------------
      // El .select() retorna un PostgrestFilterBuilder que exposa 
      // els mètodes de filtratge (eq, gte, lte).
      let query = supabase
          .from('quotes')
          .select('*, contacts(nom, empresa)'); 

        
        // Aplicació de filtres
        for (const key in searchParams) {
             const value = searchParams[key];
             if (value && typeof value === 'string') {
                 
                 if (key === 'status') {
                     // Utilitzem un string literal typecast basat en l'enum de la DB (quote_status)
                     type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Invoiced";
                     const allowedStatuses: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Declined", "Invoiced"];
                     if (allowedStatuses.includes(value as QuoteStatus)) {
                         // ✅ query.eq és ara vàlid
                         query = query.eq('status', value as QuoteStatus);
                     }
                 }
                 if (key === 'issue_date_from') {
                     // ✅ query.gte és ara vàlid
                     query = query.gte('issue_date', value);
                 }
                 if (key === 'issue_date_to') {
                     // ✅ query.lte és ara vàlid
                     query = query.lte('issue_date', value);
                 }
             }
          }

          // Aplicació de l'ordenació
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
                          // Definim una llista de columnes permeses per evitar 'any'
                          const allowedColumns = ['issue_date', 'status', 'total', 'id', 'contact_id'] as const;
                          type AllowedColumn = typeof allowedColumns[number];
                          if (allowedColumns.includes(column as AllowedColumn)) {
                              query = query.order(column as AllowedColumn, { ascending });
                          }
                      }
                  }
              }
          }

        if (!sortApplied) {
            query = query.order('issue_date', { ascending: false });
        }

        // -------------------------------------------------------------
        // ✅ APLICACIÓ DEL TIPUS FINAL I EXECUCIÓ DE LA CONSULTA
        // S'aplica .returns<T>() just abans de l'await per tancar la cadena.
        // -------------------------------------------------------------
        const { data: quotes, error } = await query.returns<QuoteWithContact[]>();
        if (error) throw error;
        
        // El tipus de quotes és QuoteWithContact[] | null, ja que Postgrest.data
        // sempre pot ser null si no hi ha resultats.
        return <QuotesClient initialQuotes={quotes || []} />;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error loading quotes:", errorMessage);
        return <div className="p-8 text-center text-destructive">Error loading quotes.</div>;
    }
}