// /app/[locale]/(app)/crm/contactes/[contactId]/_components/ContactDetailData.tsx
import { notFound } from 'next/navigation';
import { ContactDetailClient } from './contact-detail-client';
import { validatePageSession } from "@/lib/supabase/session";

// ✅ 1. Importem els nostres serveis
import { 
    fetchContactDetail, 
    getContactRelatedData 
} from '@/lib/services/crm/contacts/contacts.service';
// ✅ 2. Importem el tipus des del servei (per passar-lo al client)
import type { ContactDetail, ContactRelatedData } from '@/lib/services/crm/contacts/contacts.service';
export type { ContactDetail, ContactRelatedData }; // Re-exportem

interface ContactDetailDataProps {
    params: { contactId: string };
}

export async function ContactDetailData({ params }: ContactDetailDataProps) {
    const { supabase, activeTeamId } = await validatePageSession();
    const contactId = params.contactId;

    const numericContactId = parseInt(contactId, 10);
    if (isNaN(numericContactId)) {
        notFound();
    }

    // ✅ 3. Cridem a TOTA la lògica de dades en paral·lel
    const [contactData, relatedData] = await Promise.all([
        fetchContactDetail(supabase, numericContactId, activeTeamId),
        getContactRelatedData(supabase, numericContactId, activeTeamId)
    ]);

    // Si el contacte principal no existeix, és un 404
    if (!contactData) {
        notFound();
    }

    // ✅ 4. Passem les dades netes al client
    return <ContactDetailClient 
        initialContact={contactData} 
        initialRelatedData={relatedData} 
    />;
}