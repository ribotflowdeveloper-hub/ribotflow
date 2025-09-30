// /app/[locale]/crm/contactes/_components/ContactsData.tsx
import { ContactsClient } from './contacts-client';
import type { Contact } from '@/types/crm';
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la nova funció

const ITEMS_PER_PAGE = 50;

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}

export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {
    // ✅ 2. Cridem a la nostra funció centralitzada.
    const session = await validateUserSession();

    // Si la sessió no és vàlida (usuari no logat o sense equip actiu),
    // mostrem el component client amb dades buides.
    if ('error' in session) {
        console.error("ContactsData: Sessió invàlida.", session.error.message);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }

    // A partir d'aquí, sabem que tenim una sessió vàlida.
    const { supabase } = session;

    const currentPage = Number(page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
        .from('contacts')
        .select('*, opportunities(id, value)', { count: 'exact' });

    // ✅ FILTRE OBLIGATORI: Ja no cal afegir .eq('team_id', teamId) manualment!
    // La política RLS que crearàs per a la taula 'contacts' ho farà automàticament.

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
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

    return (
        <ContactsClient 
            initialContacts={contacts as Contact[] || []} 
            totalPages={totalPages} 
            currentPage={currentPage}
            initialSortBy={sortBy}
            initialStatus={status}
            initialViewMode={viewMode}
        />
    );
}