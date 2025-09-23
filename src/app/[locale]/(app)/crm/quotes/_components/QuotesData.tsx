// /app/crm/quotes/_components/QuotesData.tsx

import { createClient } from '@/lib/supabase/server';
import { QuotesClient } from './QuotesClient';
import type { QuoteWithContact } from '../page';
import { cookies } from 'next/headers';

export async function QuotesData({ searchParams }: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    try {
        const supabase = createClient(cookies());
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return <QuotesClient initialQuotes={[]} />;

        // --- LÒGICA D'EQUIP ---
        // 1. Busquem l'equip de l'usuari actual.
        const { data: member, error: memberError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .single();

        if (memberError || !member) {
            console.error("L'usuari no pertany a cap equip.", memberError);
            return <QuotesClient initialQuotes={[]} />;
        }
        const teamId = member.team_id;
        // ----------------------

        // Comencem la consulta base
        let query = supabase
            .from('quotes')
            .select('*, contacts(nom, empresa)');

        // ✅ FILTRE MESTRE: Filtrem sempre per l'ID de l'equip.
        query = query.eq('team_id', teamId);


        // ✅ PAS 1: APLICAR FILTRES DINÀMICS
        // Iterem sobre els searchParams per afegir els filtres.
        for (const key in searchParams) {
            const value = searchParams[key];
            if (value && typeof value === 'string') {
                // Filtre per estat (exemple)
                if (key === 'status') {
                    query = query.eq('status', value);
                }
                // Filtre per data des de (exemple)
                if (key === 'issue_date_from') {
                    query = query.gte('issue_date', value);
                }
                // Filtre per data fins a (exemple)
                if (key === 'issue_date_to') {
                    query = query.lte('issue_date', value);
                }
                // Filtre per cerca de text en el nom del client (exemple)
                if (key === 'search') {
                    // ATENCIÓ: el filtre en taules relacionades és més complex
                    // Aquesta és una simplificació. Per a un filtre real
                    // a 'contacts.nom' potser necessites una funció RPC a Supabase.
                    // Però si fos un camp a 'quotes', seria així:
                    // query = query.ilike('nom_del_camp_a_quotes', `%${value}%`);
                }
            }
        }

        // ✅ PAS 2: APLICAR ORDENACIÓ DINÀMICA
        let sortApplied = false;
        for (const key in searchParams) {
            if (key.startsWith('sortBy-')) {
                const column = key.substring(7);
                const order = searchParams[key] as string;

                if (column && (order === 'asc' || order === 'desc')) {
                    sortApplied = true;
                    const ascending = order === 'asc';

                    // Gestió correcta per a taules relacionades
                    if (column.includes('.')) {
                        const [referencedTable, referencedColumn] = column.split('.');
                        query = query.order(referencedColumn, { referencedTable, ascending });
                    } else {
                        query = query.order(column, { ascending });
                    }
                }
            }
        }

        // Apliquem una ordenació per defecte si no n'hi ha cap a la URL.
        if (!sortApplied) {
            query = query.order('issue_date', { ascending: false });
        }

        // ✅ PAS 3: EXECUTAR LA CONSULTA FINAL
        const { data: quotes, error } = await query;
        if (error) throw error;

        const typedQuotes = (quotes as QuoteWithContact[]) || [];

        // Passem les dades filtrades i ordenades al component client
        return <QuotesClient initialQuotes={typedQuotes} />;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconegut";
        console.error("Error en carregar els pressupostos:", errorMessage);
        return <div className="p-8 text-center text-destructive">Error en carregar els pressupostos.</div>;
    }
}