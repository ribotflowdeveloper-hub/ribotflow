// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteEditorData.tsx (MODIFICAT)

import { redirect } from 'next/navigation';
import { QuoteEditorClient } from './QuoteEditorClient';
import { validatePageSession } from "@/lib/supabase/session";
import type { Database } from '@/types/supabase';

// --- Tipus Derivats (sense canvis) ---
type Quote = Database['public']['Tables']['quotes']['Row'];
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Team = Database['public']['Tables']['teams']['Row']; // <-- El tipus que ara farem servir
type QuoteDetailsResponse = {
    quote: Quote & { items: QuoteItem[] };
    opportunities: Opportunity[];
}

interface QuoteEditorDataProps {
    quoteId: string;
    locale: string;
}

// Tipus per a un nou pressupost que encara no té ID a la BD
type NewQuote = Omit<Quote, 'id'> & { id: 'new'; items: Partial<QuoteItem>[] };
// Define a union type for initialQuote to accept both new and existing quotes
type InitialQuoteType = (Quote & { items: QuoteItem[] }) | NewQuote;

export async function QuoteEditorData({ quoteId, locale }: QuoteEditorDataProps) {
    const { supabase, user, activeTeamId } = await validatePageSession();

    // --- LÒGICA PER A UN PRESSUPOST NOU (sense canvis a la lògica principal) ---
    if (quoteId === 'new') {
        const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
            supabase.from('contacts').select('*'),
            supabase.from('products').select('*').eq('is_active', true),
            supabase.from('teams').select('*').eq('id', activeTeamId).single(),
            supabase.from('quotes')
                .select('sequence_number')
                .eq('team_id', activeTeamId)
                .order('sequence_number', { ascending: false })
                .limit(1)
                .maybeSingle()
        ]);

        // ... (gestió d'errors i càlcul de número de pressupost igual que abans) ...
        if (contactsRes.error || productsRes.error || teamRes.error || lastQuoteRes.error) {
            console.error("Error en carregar les dades per a un nou pressupost:", { /* ... errors ... */ });
            return <div>Error en carregar les dades de l'editor.</div>;
        }
        const lastSequence = lastQuoteRes.data?.sequence_number || 0;
        const nextSequence = lastSequence + 1;
        const year = new Date().getFullYear();
        const formattedQuoteNumber = `PRE-${year}-${String(nextSequence).padStart(4, '0')}`;
        // ... (construcció de 'initialQuote: NewQuote' igual que abans) ...
        const initialQuote: NewQuote = {
            id: 'new',
            team_id: activeTeamId,
            user_id: user.id,
            contact_id: null,
            opportunity_id: null,
            quote_number: formattedQuoteNumber,
            sequence_number: nextSequence,
            issue_date: new Date().toISOString().slice(0, 10),
            expiry_date: null,
            status: 'Draft',
            notes: 'Gràcies pel vostre interès en els nostres serveis.',
            subtotal: 0,
            discount: 0,
            tax: 0,
            tax_percent: 21,
            total: 0,
            show_quantity: true,
            created_at: new Date().toISOString(),
            sent_at: null,
            rejection_reason: null,
            send_at: null, // Assegura't que 'send_at' existeix al teu tipus Quote o elimina'l si no
            theme_color: null,
            secure_id: crypto.randomUUID(),
            items: [{ /* ... item inicial ... */ }]
        };


        // Passem null com a pdfUrl per a nous pressupostos
        return (
            <QuoteEditorClient
                initialQuote={initialQuote as InitialQuoteType} // Cast necessari per la unió
                contacts={contactsRes.data || []}
                products={productsRes.data || []}
                companyProfile={teamRes.data as Team | null}
                initialOpportunities={[]}
                userId={user.id}
                locale={locale}
                pdfUrl={null} // 👈 Nou pressupost, no hi ha PDF encara
            />
        );
    }

    // --- LÒGICA PER A EDITAR UN PRESSUPOST EXISTENT ---
    const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise.all([
        supabase.from('contacts').select('*'),
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('teams').select('*').eq('id', activeTeamId).single(),
        supabase.rpc('get_quote_details', { p_quote_id: Number(quoteId) }).single<QuoteDetailsResponse>()
    ]);

    if (contactsRes.error || productsRes.error || teamRes.error || quoteDetailsRes.error) {
        console.error("Error en carregar les dades d'un pressupost existent:", { /* ... errors ... */ });
        return <div>Error en carregar les dades de l'editor.</div>;
    }

    const quoteDetails = quoteDetailsRes.data;

    if (!quoteDetails?.quote) {
        redirect(`/${locale}/crm/quotes`);
    }

    // ✅ <<< INICI: Lògica per generar la URL signada del PDF >>>
    let pdfUrl: string | null = null;
    const filePath = `quotes/${activeTeamId}/${quoteId}.pdf`; // Construïm el path PRIVAT

    const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('fitxers-privats') // Apuntem al bucket PRIVAT
        .createSignedUrl(filePath, 60 * 5); // Generem URL per 5 minuts (ajusta segons necessitis)

    if (signedUrlError) {
        // Important: NO llencem un error aquí si el PDF no existeix.
        // Podria ser que encara no s'hagi generat o enviat.
        console.warn(`No s'ha pogut generar la URL signada per a ${filePath}: ${signedUrlError.message}`);
        // pdfUrl romandrà null, i el client ho gestionarà (ex: desactivant el botó)
    } else {
        pdfUrl = signedUrlData.signedUrl;
    }
    // ✅ <<< FI: Lògica per generar la URL signada del PDF >>>

    return (
        <QuoteEditorClient
            initialQuote={quoteDetails.quote}
            contacts={contactsRes.data || []}
            products={productsRes.data || []}
            companyProfile={teamRes.data as Team | null}
            initialOpportunities={quoteDetails.opportunities || []}
            userId={user.id}
            locale={locale}
            pdfUrl={pdfUrl} // 👈 Passem la URL signada (o null si hi ha error/no existeix)
        />
    );
}