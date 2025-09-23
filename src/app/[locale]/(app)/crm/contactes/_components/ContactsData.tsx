import { createClient } from '@/lib/supabase/server';
import { ContactsClient } from './contacts-client';
import type { Contact } from '@/types/crm';
import { cookies } from 'next/headers';

const ITEMS_PER_PAGE = 50;

interface ContactsDataProps {
    page: string;
    sortBy: string;
    status: string;
    searchTerm: string;
    viewMode: 'cards' | 'list';
}

export async function ContactsData({ page, sortBy, status, searchTerm, viewMode }: ContactsDataProps) {
    console.log("\n--- INICIANT ContactsData (Mode Depuració) ---");
    
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("PAS 1: No s'ha trobat usuari. Retornant client buit.");
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }
    console.log(`PAS 1: Usuari autenticat trobat. ID: ${user.id}`);

    // --- AQUESTA ÉS L'ADDICIÓ CLAU ---
    // 1. Busquem l'equip de l'usuari actual.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

    // Si l'usuari no pertany a cap equip, no tindrà contactes per veure.
    if (memberError || !member) {
        console.error("!!! ERROR PAS 2: L'usuari no pertany a cap equip o hi ha hagut un error.", memberError);
        return <ContactsClient initialContacts={[]} totalPages={0} currentPage={1} initialSortBy={sortBy} initialStatus={status} initialViewMode={viewMode} />;
    }
    const teamId = member.team_id;
    console.log(`PAS 2: Equip de l'usuari trobat. team_id: ${teamId}`);
    // ------------------------------------

    const currentPage = Number(page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
        .from('contacts')
        .select('*, opportunities(id, value)', { count: 'exact' });

    // ✅ NOU FILTRE OBLIGATORI: Filtrem sempre per l'ID de l'equip.
    query = query.eq('team_id', teamId);
    console.log(`PAS 3: Consulta preparada. Filtre principal aplicat: team_id = ${teamId}`);

    // 1. Filtre de cerca (si n'hi ha)
    if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        console.log(` -> Afegit filtre de cerca: ${searchTerm}`);
    }

    // 2. Filtre d'estat (si no és 'tots')
    if (status && status !== 'all') {
        query = query.eq('estat', status);
        console.log(` -> Afegit filtre d'estat: ${status}`);
    }
    
    // 3. Ordenació
    query = query.order('created_at', { ascending: sortBy === 'oldest' });
    console.log(` -> Afegida ordenació: ${sortBy}`);
    
    // 4. Paginació
    query = query.range(from, to);
    console.log(` -> Afegida paginació: de ${from} a ${to}`);

    console.log("PAS 4: Executant la consulta final a la base de dades...");
    const { data: contacts, error, count } = await query;
    
    console.log("\n--- RESULTAT DE LA CONSULTA DE CONTACTES ---");
    if (error) {
        console.error("!!! ERROR en executar la consulta:", error);
    } else {
        console.log(`   Contactes trobats en aquesta pàgina: ${contacts?.length || 0}`);
        console.log(`   Recompte total a la base de dades (count): ${count}`);
        console.log("   Dades rebudes:", JSON.stringify(contacts, null, 2));
    }
    console.log("------------------------------------------\n");

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
            initialSortBy={sortBy}
            initialStatus={status}
            initialViewMode={viewMode}
        />
    );
}

