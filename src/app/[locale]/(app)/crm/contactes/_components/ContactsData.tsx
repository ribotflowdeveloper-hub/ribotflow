import { ContactsClient } from './contacts-client';
import { validatePageSession } from "@/lib/supabase/session";
// ✅ 1. Importem el nou servei i el tipus
import { getPaginatedContacts, type ContactWithOpportunities } from '@/lib/services/contacts.service';

// ✅ 2. Exportem el tipus per al client
export type { ContactWithOpportunities };

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}

export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {

    const session = await validatePageSession(); // ⬅️ 2. Cridem la funció correcta

    if ('error' in session) {
        console.error(
            "ContactsData: Sessió invàlida.",
            typeof session.error === "object" && session.error !== null && "message" in session.error
                ? (session.error as { message?: string }).message
                : session.error
        );
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialViewMode={viewMode} />;
    }

    // ✅ 3. Ara aquesta desestructuració és segura i està correctament tipada
    // TypeScript sap que 'session' conté 'supabase' i 'activeTeamId'
    // (També he eliminat el '_' extra al final, que semblava un error de sintaxi)
    const { supabase, activeTeamId } = session;

    // ✅ 4. Cridem el servei amb un objecte d'opcions net
    const { data, error } = await getPaginatedContacts(supabase, {
        teamId: activeTeamId, // Passem el teamId obtingut de la sessió
        page: Number(page) || 1,
        sortBy,
        status,
        searchTerm
    });

    // ✅ 5. Gestionem l'error
    if (error || !data) {
        console.error("Error en obtenir contactes (Component):", error);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialViewMode={viewMode} />;
    }

    // ✅ 6. Passem les dades del payload al component client
    return (
        <ContactsClient
            initialContacts={data.contacts}
            totalPages={data.totalPages}
            currentPage={data.currentPage}
            initialViewMode={viewMode}
        />
    );
}