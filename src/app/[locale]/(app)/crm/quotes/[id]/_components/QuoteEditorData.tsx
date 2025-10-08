import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './QuoteEditorClient';
import type { Quote } from '@/types/crm';
import { validatePageSession } from "@/lib/supabase/session";

interface QuoteEditorDataProps {
    quoteId: string;
}

/**
 * Aquest és un Server Component que s'encarrega de tota la càrrega de dades
 * necessària per a l'editor de pressupostos. Prepara totes les 'props'
 * i les passa al component de client 'QuoteEditorClient', que gestionarà la UI.
 */
export async function QuoteEditorData({ quoteId }: QuoteEditorDataProps) {
    // 1. Validació de la sessió: Assegura que l'usuari està autenticat
    // i té un equip actiu. Si no, redirigeix automàticament.
    const { supabase, user, activeTeamId } = await validatePageSession();
    
    // --- LÒGICA PER A UN PRESSUPOST NOU ---
    if (quoteId === 'new') {
        // Per a un pressupost nou, necessitem carregar dades de suport (contactes, productes)
        // i calcular el següent número de pressupost.
        const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
            supabase.from('contacts').select('id, nom, empresa'),
            supabase.from('products').select('*').eq('is_active', true),
            supabase.from('teams').select('*').eq('id', activeTeamId).single(),
            supabase.from('quotes').select('quote_number').order('created_at', { ascending: false }).limit(1).single()
        ]);

        // Gestió d'errors per a les consultes
        if (contactsRes.error || productsRes.error || teamRes.error || lastQuoteRes.error) {
            console.error("Error en carregar les dades per a un nou pressupost:", {
                contacts: contactsRes.error,
                products: productsRes.error,
                team: teamRes.error,
                lastQuote: lastQuoteRes.error,
            });
            return <div>Error en carregar les dades de l'editor.</div>;
        }
        
        // Càlcul del següent número de pressupost
        const lastQuote = lastQuoteRes.data;
        let nextNumber = 1;
        if (lastQuote?.quote_number) {
            const match = lastQuote.quote_number.match(/\d+$/);
            if (match) nextNumber = parseInt(match[0]) + 1;
        }
        const year = new Date().getFullYear();

        // Creació de l'objecte inicial per al nou pressupost
        const initialQuote: Quote = {
            id: 'new',
            contact_id: null,
            quote_number: `PRE-${year}-${String(nextNumber).padStart(4, '0')}`,
            issue_date: new Date().toISOString().slice(0, 10),
            status: 'Draft',
            notes: 'Gràcies pel vostre interès en els nostres serveis.',
            discount: 0,
            subtotal: 0, tax: 0, total: 0,
            tax_percent: 21,
            show_quantity: true,
            items: [{
                description: '', quantity: 1, unit_price: 0,
                product_id: null, user_id: user.id
            }]
        };

        // Passem les dades al component de client
        return (
            <QuoteEditorClient
                initialQuote={initialQuote}
                contacts={contactsRes.data || []}
                products={productsRes.data || []}
                companyProfile={teamRes.data}
                initialOpportunities={[]} // No hi ha oportunitats al crear un pressupost sense client
                userId={user.id}
            />
        );
    }

    // --- LÒGICA PER A EDITAR UN PRESSUPOST EXISTENT ---
    // Utilitzem la funció RPC 'get_quote_details' per a obtenir el pressupost i les
    // oportunitats relacionades en una sola crida a la base de dades.
    const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise.all([
        supabase.from('contacts').select('id, nom, empresa'),
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('teams').select('*').eq('id', activeTeamId).single(),
        supabase.rpc('get_quote_details', { p_quote_id: quoteId })
    ]);

    // Gestió d'errors per a les consultes
    if (contactsRes.error || productsRes.error || teamRes.error || quoteDetailsRes.error) {
        console.error("Error en carregar les dades d'un pressupost existent:", {
            contacts: contactsRes.error,
            products: productsRes.error,
            team: teamRes.error,
            quoteDetails: quoteDetailsRes.error,
        });
        return <div>Error en carregar les dades de l'editor.</div>;
    }

    const quoteDetails = quoteDetailsRes.data;
    // Si la funció RPC no retorna un pressupost, vol dir que no existeix o l'usuari no hi té accés
    if (!quoteDetails?.quote) {
        redirect('/crm/quotes');
    }

    // Passem les dades obtingudes al component de client
    return (
        <QuoteEditorClient
            initialQuote={quoteDetails.quote as unknown as Quote}
            contacts={contactsRes.data || []}
            products={productsRes.data || []}
            companyProfile={teamRes.data}
            initialOpportunities={quoteDetails.opportunities || []}
            userId={user.id}
        />
    );
}