// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/ContactDetailData.tsx
import { notFound } from 'next/navigation';
import { validatePageSession } from "@/lib/supabase/session";
import { 
    fetchContactDetail, 
    getContactRelatedData,
  
} from '@/lib/services/crm/contacts/contacts.service';

import { ContactDetailClient } from './contact-detail-client';

interface ContactDetailDataProps {
    params: { contactId: string };
}

export async function ContactDetailData({ params }: ContactDetailDataProps) {
    const session = await validatePageSession();
    if ('error' in session) {
        // Si no hi ha sessió, Next.js middleware hauria d'haver actuat, 
        // però per seguretat:
        notFound(); 
    }
    const { supabase, activeTeamId } = session;

    const numericId = parseInt(params.contactId, 10);
    if (isNaN(numericId)) notFound();

    // Execució en paral·lel per millor TTFB (Time To First Byte)
    const [contact, relatedData] = await Promise.all([
        fetchContactDetail(supabase, numericId, activeTeamId),
        getContactRelatedData(supabase, numericId, activeTeamId)
    ]);

    if (!contact) notFound();

    return (
        <ContactDetailClient 
            initialContact={contact} 
            initialRelatedData={relatedData} 
        />
    );
}