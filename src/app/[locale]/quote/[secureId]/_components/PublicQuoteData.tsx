import { createClient } from '@/lib/supabase/server'; 
import type { QuoteDataFromServer, QuoteItem, Quote, Opportunity } from "@/types/finances/quotes"; 

// Definim el tipus que retorna l'RPC
type QuoteDetailsResponse = {
    quote: Quote & { items: QuoteItem[] }; // Ojo: Aquí items ja inclou taxes
    opportunities: Opportunity[];
};

export async function getQuoteDataBySecureId(secureId: string): Promise<QuoteDataFromServer | null> {
    const supabase = await createClient();

    // 1. Recuperar l'ID numèric
    const { data: quoteIdData, error: idError } = await supabase
        .from('quotes')
        .select('id')
        .eq('secure_id', secureId)
        .single();
    
    if (idError || !quoteIdData) return null;

    // 2. Cridar a l'RPC amb el tipus genèric
    const { data, error } = await supabase
        .rpc('get_quote_details', { p_quote_id: quoteIdData.id })
        .single<QuoteDetailsResponse>(); // ✅ AQUEST ÉS EL CANVI CLAU

    if (error || !data || !data.quote) {
        console.error("Error RPC Public:", error);
        return null;
    }

    const quote = data.quote;
    
    // 3. Recuperar contacte i equip
    // Nota: Si 'quote.contact_id' pot ser null, cal comprovar-ho abans
    if (!quote.contact_id || !quote.team_id) {
         console.error("Dades incompletes al pressupost");
         return null;
    }

    const [contactRes, teamRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', quote.contact_id).single(),
        supabase.from('teams').select('*').eq('id', quote.team_id).single()
    ]);

    // Construïm el paquet final
    // Fem servir un objecte intermedi per evitar conflictes de tipus estrictes
    const fullData = {
        ...quote,
        contacts: contactRes.data,
        team: teamRes.data,
        items: quote.items || [] 
    };

    return fullData as unknown as QuoteDataFromServer;
}