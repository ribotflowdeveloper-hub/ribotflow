// Al teu fitxer de servidor (p.ex. /quote/[secureId]/page.tsx)
import { createClient } from '@/lib/supabase/server'; 
import type { QuoteDataFromServer } from "@/types/crm"; 

/**
 * Funció de servidor per obtenir les dades d'un pressupost (versió manual).
 * @param secureId L'ID únic del pressupost.
 * @returns Les dades del pressupost o null si no es troba.
 */
export async function getQuoteDataBySecureId(secureId: string): Promise<QuoteDataFromServer | null> {
    
    const supabase = createClient();

    // PAS 1: Obtenim el pressupost (sense els items)
    // CORRECCIÓ: La cadena 'select' ara està en una sola línia i és neta.
    const selectString = "*, contacts (*), team:teams (*)";

    const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select(selectString) // <-- Això ara serà correctament interpretat
        .eq("secure_id", secureId)
        .single();

    // Aquesta comprovació ara funcionarà
    if (quoteError || !quoteData) {
        console.error("Error carregant dades del pressupost (Pas 1):", quoteError?.message || "Dades no trobades");
        return null;
    }
    
    // Si arribem aquí, 'quoteData' ÉS un objecte.
    // Els errors de TypeScript desapareixeran.

    // PAS 2: Obtenim els items manualment
    // Aquesta consulta farà servir el 'quoteData.id' (que ara existeix)
    const { data: itemsData, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteData.id); // <-- Això ara funcionarà

    if (itemsError) {
        console.error("Pressupost trobat, però error en carregar items (Pas 2):", itemsError.message);
    }

    // PAS 3: Combinem els resultats manualment
    const fullData = {
        ...quoteData, // <-- Això ara funcionarà
        quote_items: itemsData || [] // Afegim els items aquí
    };

    return fullData as unknown as QuoteDataFromServer;
}