
import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './QuoteEditorClient';
// ✅ Canviem la importació de tipus per a utilitzar els nous centralitzats i correctes
import type { Quote, Contact, Product , Opportunity} from '@/types/crm';
import type { Team as TeamData, } from '@/types/settings/team';
import { validatePageSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció

interface QuoteEditorDataProps {
    quoteId: string;
}

export async function QuoteEditorData({ quoteId }: QuoteEditorDataProps) {
   // ✅ 2. Validació de sessió que gestiona les redireccions automàticament.
   const { supabase, user, activeTeamId } = await validatePageSession();
    
   const [contactsRes, productsRes, teamRes] = await Promise.all([
       supabase.from('contacts').select('id, nom, empresa'),
       supabase.from('products').select('*').eq('is_active', true),
       supabase.from('teams').select('*').eq('id', activeTeamId).single(),
   ]);

    const contacts = (contactsRes.data as Contact[]) || [];
    const products = (productsRes.data as Product[]) || [];
    // ✅ CORRECCIÓ DE TIPUS: Ara 'teamData' coincideix amb el que espera el client
    const teamData = teamRes.data as TeamData | null;

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
    } else {
        // La RLS a 'quotes' s'assegurarà que només puguem carregar un pressupost de l'equip actiu
        const { data: quoteData } = await supabase.from('quotes').select('*, items:quote_items(*)').eq('id', quoteId).single();
        if (!quoteData) redirect('/crm/quotes');

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
            companyProfile={teamData} // ✅ Passem les dades de l'equip correctament
            initialOpportunities={contactOpportunities}
            userId={user.id}
        />
    );
}