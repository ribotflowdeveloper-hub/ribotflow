import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './QuoteEditorClient';
import type { Quote } from '@/types/crm';
import { validatePageSession } from "@/lib/supabase/session";

interface QuoteEditorDataProps {
    quoteId: string;
    locale: string; // ✅ AFEGIM LOCALE A LES PROPS

}

/**
 * Aquest és un Server Component que s'encarrega de tota la càrrega de dades
 * necessària per a l'editor de pressupostos. Prepara totes les 'props'
 * i les passa al component de client 'QuoteEditorClient', que gestionarà la UI.
 */
export async function QuoteEditorData({ quoteId, locale }: QuoteEditorDataProps) {
    // 1. Validació de la sessió: Assegura que l'usuari està autenticat
    // i té un equip actiu. Si no, redirigeix automàticament.
    const { supabase, user, activeTeamId } = await validatePageSession();

    // --- LÒGICA PER A UN PRESSUPOST NOU ---
    if (quoteId === 'new') {
        // Per a un pressupost nou, necessitem carregar dades de suport i calcular el següent número.
        const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
            supabase.from('contacts').select('id, nom, empresa'),
            supabase.from('products').select('*').eq('is_active', true),
            supabase.from('teams').select('*').eq('id', activeTeamId).single(),
            // ✅ Busquem l'últim pressupost per ordenar-lo per número de forma descendent
            supabase.from('quotes')
                .select('sequence_number') // Seleccionem la nova columna numèrica
                .eq('team_id', activeTeamId)
                .order('sequence_number', { ascending: false }) // Ordenem per número, no per text
                .limit(1)
                .maybeSingle() // maybeSingle() evita errors si la taula està buida
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
        // ✅ LÒGICA PER CALCULAR EL NOU NÚMERO
        // ✅ La lògica de càlcul és ara trivial i sense errors
        const lastSequence = lastQuoteRes.data?.sequence_number || 0;
        const nextSequence = lastSequence + 1;
        const year = new Date().getFullYear();
        const formattedQuoteNumber = `PRE-${year}-${String(nextSequence).padStart(4, '0')}`;

        // Creació de l'objecte inicial per al nou pressupost
        const initialQuote: Quote = {
            id: 'new',
            contact_id: null,
            quote_number: formattedQuoteNumber, // El text formatat
            sequence_number: nextSequence, // ✅ El nou valor numèric
            issue_date: new Date().toISOString().slice(0, 10),
            status: 'Draft',
            notes: 'Gràcies pel vostre interès en els nostres serveis.',
            discount: 0,
            subtotal: 0, tax: 0, total: 0,
            tax_percent: 21,
            show_quantity: true,
            items: [{
                description: '',
                quantity: 1,
                unit_price: 0,
                product_id: null,
                user_id: user.id,
                // ✅ AFEGIM LES PROPIETATS QUE FALTEN
                tax_rate: 21, // Un valor per defecte, com el general del pressupost
                total: 0      // El total inicial és 0
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
                locale={locale} // ✅ PASSEM LA PROP

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
            locale={locale} // ✅ PASSEM LA PROP

        />
    );
}