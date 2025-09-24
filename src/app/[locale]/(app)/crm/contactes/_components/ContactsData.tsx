// /app/[locale]/crm/contactes/_components/ContactsData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ContactsClient } from './contacts-client';
import type { Contact } from '@/types/crm';

const ITEMS_PER_PAGE = 50;

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}

export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }

    // --- AQUESTA ÉS LA NOVA LÒGICA CORRECTA ---
    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');

    if (claimsError || !claimsString) {
        console.error("Error crític: No s'ha pogut obtenir la informació del token de l'usuari des de la BD:", claimsError);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }

    const claims = JSON.parse(claimsString);
    const activeTeamId = claims.app_metadata?.active_team_id;

    if (!activeTeamId) {
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }
    // ------------------------------------------

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