// /app/[locale]/crm/contactes/[contactId]/_components/ContactDetailData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ContactDetailClient } from './contact-detail-client';
import type { Contact, Quote, Opportunity, Invoice, Activity } from '@/types/crm';

export async function ContactDetailData({ contactId }: { contactId: string }) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // --- ROBUST ACTIVE TEAM LOGIC ---
    // This is our standard, secure way to get the active team ID.
    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');
    if (claimsError || !claimsString) {
        throw new Error("Could not get user claims from the database.");
    }
    const claims = JSON.parse(claimsString);
    const activeTeamId = claims.app_metadata?.active_team_id;
    if (!activeTeamId) {
        redirect('/settings/team');
    }
    // ------------------------------------

    // ✅ SECURE QUERY: We now fetch the contact by its ID AND the active team ID.
    // The RLS policy on the 'contacts' table will enforce this, but being explicit here is good practice.
    const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('team_id', activeTeamId) // <-- CRUCIAL SECURITY FILTER
        .single();
    
    // If the contact is not found (either it doesn't exist or doesn't belong to the team), show a 404.
    if (error || !contact) {
        notFound(); 
    }

    // ✅ SECURE PARALLEL QUERIES: All related data is also filtered by the active team ID.
    const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
        supabase.from('quotes').select('*').eq('contact_id', contactId).eq('team_id', activeTeamId).order('created_at', { ascending: false }),
        supabase.from('opportunities').select('*').eq('contact_id', contactId).eq('team_id', activeTeamId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('contact_id', contactId).eq('team_id', activeTeamId).order('created_at', { ascending: false }),
        supabase.from('activities').select('*').eq('contact_id', contactId).eq('team_id', activeTeamId).order('created_at', { ascending: false })
    ]);

    const relatedData = {
        quotes: (quotesRes.data as Quote[]) || [],
        opportunities: (oppsRes.data as Opportunity[]) || [],
        invoices: (invoicesRes.data as Invoice[]) || [],
        activities: (activitiesRes.data as Activity[]) || []
    };

    return <ContactDetailClient initialContact={contact as Contact} initialRelatedData={relatedData} />;
}