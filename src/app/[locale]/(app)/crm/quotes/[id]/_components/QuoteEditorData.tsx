// /app/crm/quotes/[id]/_components/QuoteEditorData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// ✅ CORRECTED IMPORT PATH
import { QuoteEditorClient } from './QuoteEditorClient'; 
import type { Quote, Contact, Product, CompanyProfile, Opportunity } from '@/types/crm';

interface QuoteEditorDataProps {
    quoteId: string;
}

export async function QuoteEditorData({ quoteId }: QuoteEditorDataProps) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // --- NEW, ROBUST TEAM LOGIC ---
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

    // Auxiliary data is now securely fetched via RLS
    const [contactsRes, productsRes, profileRes] = await Promise.all([
        supabase.from('contacts').select('id, nom, empresa'),
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('teams').select('*').eq('id', activeTeamId).single(),

    ]);

    const contacts = (contactsRes.data as Contact[]) || [];
    const products = (productsRes.data as Product[]) || [];
    const companyProfile = profileRes.data as CompanyProfile;

    let initialQuote: Quote;
    let contactOpportunities: Opportunity[] = [];
    
    // Logic for a NEW quote
    if (quoteId === 'new') {
        const { data: lastQuote } = await supabase
            .from('quotes')
            .select('quote_number')
            .eq('team_id', activeTeamId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        let nextNumber = 1;
        if (lastQuote?.quote_number) {
            const match = lastQuote.quote_number.match(/\d+$/);
            if (match) nextNumber = parseInt(match[0]) + 1;
        }
        const year = new Date().getFullYear();

        initialQuote = {
            id: 'new',
            contact_id: null,
            quote_number: `PRE-${year}-${String(nextNumber).padStart(4, '0')}`,
            issue_date: new Date().toISOString().slice(0, 10),
            status: 'Draft',
            notes: 'Gràcies pel vostre interès en els nostres serveis.',
            discount: 0,
            subtotal: 0, tax: 0, total: 0,
            items: [{
                description: '',
                quantity: 1,
                unit_price: 0,
                product_id: null,
                user_id: user.id
            }]
        };
    } else { // Logic for an EXISTING quote
        // This query is now SECURE. RLS on 'quotes' will prevent loading
        // a quote if it doesn't belong to the active team.
        const { data: quoteData } = await supabase.from('quotes').select('*, items:quote_items(*)').eq('id', quoteId).single();
        
        if (!quoteData) {
            redirect('/crm/quotes');
        }

        initialQuote = quoteData as unknown as Quote;
        
        if (quoteData.contact_id) {
            const { data: opportunitiesData } = await supabase.from('opportunities').select('*').eq('contact_id', quoteData.contact_id);
            contactOpportunities = (opportunitiesData as Opportunity[]) || [];
        }
    }

    return (
        <QuoteEditorClient
            initialQuote={initialQuote}
            contacts={contacts}
            products={products}
            companyProfile={companyProfile}
            initialOpportunities={contactOpportunities}
            userId={user.id} // ✅ Pass the userId to the client component
        />
    );
}