// /app/[locale]/(app)/crm/contactes/[contactId]/_components/ContactDetailData.tsx
import { notFound } from 'next/navigation';
// ✅ Importem fetchContactDetail
import { fetchContactDetail } from '../actions';
import { ContactDetailClient } from './contact-detail-client';
import { validatePageSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';

// Tipus per a dades relacionades
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

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

    // ✅ Cridem a fetchContactDetail
    const contactData = await fetchContactDetail(numericContactId);

    if (!contactData) {
        notFound();
    }

    // Carreguem dades relacionades
    const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
        supabase.from('quotes').select('*').eq('contact_id', numericContactId).eq('team_id', activeTeamId).order('created_at', { ascending: false }),
        supabase.from('opportunities').select('*').eq('contact_id', numericContactId).eq('team_id', activeTeamId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('contact_id', numericContactId).eq('team_id', activeTeamId).order('created_at', { ascending: false }),
        supabase.from('activities').select('*').eq('contact_id', numericContactId).eq('team_id', activeTeamId).order('created_at', { ascending: false })
    ]);

    const relatedData = {
        quotes: (quotesRes.data as Quote[]) || [],
        opportunities: (oppsRes.data as Opportunity[]) || [],
        invoices: (invoicesRes.data as Invoice[]) || [],
        activities: (activitiesRes.data as Activity[]) || []
    };

    // ✅ Passem contactData (tipus ContactDetail) a initialContact
    return <ContactDetailClient initialContact={contactData} initialRelatedData={relatedData} />;
}