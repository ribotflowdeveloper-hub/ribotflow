import { ContactsClient } from './contacts-client';
import { validatePageSession } from "@/lib/supabase/session";
// ✅ 1. Importem el nou servei i el tipus
import { getPaginatedContacts, type ContactWithOpportunities } from '@/lib/services/crm/contacts/contacts.service';
import { getUsageLimitStatus, type UsageCheckResult } from "@/lib/subscription/subscription";
// ✅ 2. Exportem el tipus per al client
export type { ContactWithOpportunities };

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}
// ✅ 2. Definim un estat de límit per defecte per si la sessió falla
const defaultLimit: UsageCheckResult = { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };

export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {

    const session = await validatePageSession(); // ⬅️ 2. Cridem la funció correcta

    if ('error' in session) {
        console.error(
            "ContactsData: Sessió invàlida.",
            typeof session.error === "object" && session.error !== null && "message" in session.error
                ? (session.error as { message?: string }).message
                : session.error
        );
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialViewMode={viewMode} limitStatus={defaultLimit} // Passa l'estat per defecte 
        />;
    }

    // ✅ 3. Ara aquesta desestructuració és segura i està correctament tipada
    // TypeScript sap que 'session' conté 'supabase' i 'activeTeamId'
    // (També he eliminat el '_' extra al final, que semblava un error de sintaxi)
    const { supabase, activeTeamId } = session;


    // ✅ 2. Executem tot en paral·lel
    const [limitCheck, { data, error }] = await Promise.all([
        getUsageLimitStatus('maxContacts'), // <-- Més net i reutilitzable
        getPaginatedContacts(supabase, {
            teamId: activeTeamId,
            page: Number(page) || 1,
            sortBy,
            status,
            searchTerm
        })
    ]);

    // ✅ 5. Gestionem l'error
    if (error || !data) {
        console.error("Error en obtenir contactes (Component):", error);
        return <ContactsClient
            initialContacts={[]}
            totalPages={0}
            currentPage={1}
            initialViewMode={viewMode}
            limitStatus={limitCheck} // Passa l'estat del límit fins i tot si falla la llista
        />;
    }

    return (
        <ContactsClient
            initialContacts={data.contacts}
            totalPages={data.totalPages}
            currentPage={data.currentPage}
            initialViewMode={viewMode}
            limitStatus={limitCheck} // ✅ 5. Passem l'estat del límit al client
        />
    );
}