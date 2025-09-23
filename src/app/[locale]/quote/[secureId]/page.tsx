// /app/[locale]/quote/[secureId]/page.tsx

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server'; 
import { notFound } from "next/navigation";
import { PublicQuoteClient } from "./_components/PublicQuoteClient";
import type { Quote, Contact, CompanyProfile, QuoteItem } from "@/types/crm";

// ✅ Definim el tipus de dades aquí, que és on es generen.
export type QuoteDataFromServer = Quote & {
    contacts: Contact;
    profiles: CompanyProfile;
    quote_items: QuoteItem[];
    secure_id: string;
};

interface PublicQuotePageProps {
    params: { secureId: string };
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
    const supabase = createClient(cookies());
    const { secureId } = params;

    const { data: quoteData, error } = await supabase
        .from("quotes")
        .select(`*, contacts (*), profiles (*), quote_items (*)`)
        .eq("secure_id", secureId)
        .single();

    if (error || !quoteData) {
        console.error("Error carregant les dades del pressupost:", error?.message || "Dades no trobades");
        notFound();
    }
    
    // Passem les dades al component de client. El 'cast' és segur gràcies a la consulta.
    return <PublicQuoteClient initialQuoteData={quoteData as QuoteDataFromServer} />;
}