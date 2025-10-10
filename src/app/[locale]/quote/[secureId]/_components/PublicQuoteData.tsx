import { createClient } from '@/lib/supabase/server'; 
import type { QuoteDataFromServer } from "@/types/crm"; 

/**
 * Funció de servidor per obtenir les dades d'un pressupost a partir del seu ID segur.
 * Aquesta funció encapsula la lògica de Supabase.
 * @param secureId L'ID únic del pressupost.
 * @returns Les dades del pressupost o null si no es troba.
 */
export async function getQuoteDataBySecureId(secureId: string): Promise<QuoteDataFromServer | null> {
    
    // Utilitzem el client de Supabase del servidor
    const supabase = createClient();

    // Consulta per fer JOIN amb 'contacts', 'teams' i 'quote_items'
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
        // En un entorn de producció, podríeu registrar l'error aquí sense llençar-lo
        // per a no revelar detalls sensibles al client o a la consola pública.
        console.error("Error carregant dades del pressupost:", error?.message || "Dades no trobades");
        return null;
    }
    
    // Assegurem que el tipus de retorn coincideix amb la interfície esperada
    return quoteData as QuoteDataFromServer;
}