import { validatePageSession } from "@/lib/supabase/session";
import { getPaginatedContacts } from '@/lib/services/crm/contacts/contacts.service';
import { getUsageLimitStatus, type UsageCheckResult } from "@/lib/subscription/subscription";
import { ContactsClient } from './ContactsClient'; // Assegura't del casing correcte del fitxer

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}

// Valor segur per defecte
const defaultLimit: UsageCheckResult = { allowed: false, current: 0, max: 0, error: "Error sessió" };

export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {
    const session = await validatePageSession();

    if ('error' in session) {
        return (
            <ContactsClient 
                initialContacts={[]} 
                totalPages={0} 
                currentPage={1} 
                initialViewMode={viewMode} 
                limitStatus={defaultLimit} 
            />
        );
    }

    const { supabase, activeTeamId } = session;

    // Execució paral·lela per rendiment
    try {
        const [limitCheck, contactsResult] = await Promise.all([
            getUsageLimitStatus('maxContacts'),
            getPaginatedContacts(supabase, {
                teamId: activeTeamId,
                page: Number(page) || 1,
                sortBy,
                status,
                searchTerm
            })
        ]);

        return (
            <ContactsClient
                initialContacts={contactsResult.contacts}
                totalPages={contactsResult.totalPages}
                currentPage={contactsResult.currentPage}
                initialViewMode={viewMode}
                limitStatus={limitCheck}
            />
        );
    } catch (error) {
        console.error("ContactsData Error:", error);
        // Fallback UI en cas d'error de base de dades
        return (
             <ContactsClient 
                initialContacts={[]} 
                totalPages={0} 
                currentPage={1} 
                initialViewMode={viewMode} 
                limitStatus={defaultLimit} 
            />
        );
    }
}