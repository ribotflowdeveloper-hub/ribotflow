import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ContactsData } from './_components/ContactsData';
import { ContactsSkeleton } from './_components/ContactsSkeleton';

export const metadata: Metadata = { title: 'Contactes | Ribot' };

// ✅ NOU: Definim tots els paràmetres que podem rebre
interface ContactesPageProps {
    searchParams: Promise<{ 
        page?: string;
        sort?: string;
        status?: string;
        q?: string; // També per a la cerca
        view?: 'cards' | 'list'; // ✅ NOU: Afegim el paràmetre de vista

    }>;
}

export default async function ContactesPage(props: ContactesPageProps) {
    const searchParams = await props.searchParams;
    
    // ✅ NOU: Llegim els valors de la URL o utilitzem valors per defecte
    const page = searchParams?.page || '1';
    const sortBy = searchParams?.sort || 'newest'; // Per defecte, els més nous
    const status = searchParams?.status || 'all';   // Per defecte, tots
    const searchTerm = searchParams?.q || '';       // Mantenim la cerca
    const viewMode = searchParams?.view || 'cards'; // ✅ NOU: Llegim la vista o per defecte 'cards'


    // ✅ NOU: Creem una 'key' única per a Suspense perquè es reiniciï amb cada canvi de filtre
    const suspenseKey = `${page}-${sortBy}-${status}-${searchTerm}`;

    return (
        <Suspense key={suspenseKey} fallback={<ContactsSkeleton />}>
            <ContactsData 
                page={page}
                sortBy={sortBy}
                status={status}
                searchTerm={searchTerm}
                viewMode={viewMode} // ✅ NOU: Passem la vista al component de dades

            />
        </Suspense>
    );
}