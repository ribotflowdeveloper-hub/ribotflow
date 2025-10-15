// /app/[locale]/crm/contactes/[contactId]/_components/ContactDetailData.tsx (CORREGIT)

import { notFound } from 'next/navigation';
import { ContactDetailClient } from './contact-detail-client';
import { validatePageSession } from "@/lib/supabase/session";
import { type Database } from '@/types/supabase';

type Contact = Database['public']['Tables']['contacts']['Row'];
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

export async function ContactDetailData({ contactId }: { contactId: string }) {
    const { supabase, activeTeamId } = await validatePageSession();

    // ✅ SOLUCIÓ: Convertim el contactId de string a number.
    const numericContactId = parseInt(contactId, 10);
    if (isNaN(numericContactId)) {
        // Si l'ID no és un número vàlid, no el trobarem.
        notFound();
    }

    const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        // Utilitzem l'ID numèric a la consulta.
        .eq('id', numericContactId)
        .eq('team_id', activeTeamId)
        .single();
    
    if (error || !contact) {
        notFound(); 
    }

    const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
        // Utilitzem l'ID numèric a totes les consultes relacionades.
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

    return <ContactDetailClient initialContact={contact as Contact} initialRelatedData={relatedData} />;
}