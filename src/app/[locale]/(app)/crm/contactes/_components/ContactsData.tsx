import { createClient } from '@/lib/supabase/server';
import { ContactsClient } from './contacts-client';
import type { Contact } from '@/types/crm';
import { cookies } from 'next/headers';
const ITEMS_PER_PAGE = 50;

// ✅ NOU: Acceptem els nous paràmetres de filtre
interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list'; // ✅ NOU

}

export async function ContactsData({ page, sortBy, status, searchTerm , viewMode}: ContactsDataProps) {
    const supabase = createClient(cookies()); // Ja no necessita cookies() aquí
    
    const currentPage = Number(page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // ✅ NOU: Modifiquem la consulta per aplicar els filtres
    let query = supabase
        .from('contacts')
        .select('*, opportunities(id, value)', { count: 'exact' });

    // 1. Filtre de cerca (si n'hi ha)
    if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // 2. Filtre d'estat (si no és 'tots')
    if (status && status !== 'all') {
        query = query.eq('estat', status);
    }
    
    // 3. Ordenació
    query = query.order('created_at', { ascending: sortBy === 'oldest' });
    
    // 4. Paginació
    query = query.range(from, to);

    const { data: contacts, error, count } = await query;

    if (error) {
        console.error("Error fetching contacts:", error.message);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

    return (
        <ContactsClient 
            initialContacts={contacts as Contact[] || []} 
            totalPages={totalPages} 
            currentPage={currentPage}
            // ✅ NOU: Passem els filtres inicials al component client
            initialSortBy={sortBy}
            initialStatus={status}
            initialViewMode={viewMode} // ✅ NOU: Passem la vista inicial al client

        />
    );
}