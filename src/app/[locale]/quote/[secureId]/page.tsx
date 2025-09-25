import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server'; 
import { notFound } from "next/navigation";
import { PublicQuoteClient } from "./_components/PublicQuoteClient";
import type { Quote, Contact, QuoteItem } from "@/types/crm";
import type { Team as CompanyProfile} from "@/types/settings/team"; // ✅ Importem el tipus correcte

// Definim el tipus de dades que la nostra pàgina generarà
export type QuoteDataFromServer = Quote & {
    contacts: Contact | null;
    team: CompanyProfile | null; // ✅ Canviat de 'profiles' a 'team'
    quote_items: QuoteItem[];
    secure_id: string;
};

interface PublicQuotePageProps {
    params: { secureId: string };
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
    const supabase = createClient(cookies());
    const { secureId } = params;

    // ✅ CONSULTA ACTUALITZADA: Fem JOIN amb 'contacts' i 'teams'
    const { data: quoteData, error } = await supabase
        .from("quotes")
        .select(`
            *, 
            contacts (*), 
            team:teams (*), 
            quote_items (*)
        `)
        .eq("secure_id", secureId)
        .single();

    if (error || !quoteData) {
        console.error("Error carregant les dades del pressupost:", error?.message || "Dades no trobades");
        notFound();
    }
    
    return <PublicQuoteClient initialQuoteData={quoteData as QuoteDataFromServer} />;
}