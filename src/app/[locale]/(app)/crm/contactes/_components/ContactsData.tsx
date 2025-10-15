// /app/[locale]/crm/contactes/_components/ContactsData.tsx (Versió Refactoritzada)

import { ContactsClient } from './contacts-client';
// ✅ 1. Importem la definició completa de la base de dades
import { Database } from "@/types/supabase";
import { validateUserSession } from "@/lib/supabase/session";

const ITEMS_PER_PAGE = 50;

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}

// ✅ 2. Definim el tipus que representa el resultat EXACTE de la consulta.
// És una fila de 'contacts' enriquida amb un array d'objectes (o null) d' 'opportunities'.
export type ContactWithOpportunities = Database['public']['Tables']['contacts']['Row'] & {
  opportunities: Pick<Database['public']['Tables']['opportunities']['Row'], 'id' | 'value'>[] | null;
};


export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {
    const session = await validateUserSession();

    if ('error' in session) {
        console.error("ContactsData: Sessió invàlida.", session.error.message);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialViewMode={viewMode} />;
    }

    const { supabase } = session;
    const currentPage = Number(page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
        .from('contacts')
        .select('*, opportunities(id, value)', { count: 'exact' });

    if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    if (status && status !== 'all') {
        query = query.eq('estat', status);
    }
    query = query.order('created_at', { ascending: sortBy === 'oldest' });
    query = query.range(from, to);

    const { data: contacts, error, count } = await query;
    
    if (error) {
        console.error("Error en obtenir contactes (pot ser per RLS):", error.message);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialViewMode={viewMode} />;
    }

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

    return (
        <ContactsClient 
            // ✅ 3. Passem les dades amb el nou tipus. L'ús de 'as' aquí és segur perquè hem definit el tipus per a aquesta consulta.
            initialContacts={contacts as ContactWithOpportunities[] || []} 
            totalPages={totalPages} 
            currentPage={currentPage}
            initialViewMode={viewMode}
        />
    );
}