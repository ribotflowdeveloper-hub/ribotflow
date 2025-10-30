// Al teu fitxer de servidor (p.ex. /quote/[secureId]/page.tsx)
import { createClient } from '@/lib/supabase/server'; 
import type { QuoteDataFromServer } from "@/types/crm"; 
// 1. Importem els tipus de la base de dades (assegura't que la ruta és correcta)
import { type Database } from '@/types/supabase'; 

// 2. Definim el tipus que SÍ esperem al Pas 1
type QuoteWithRelations = Database['public']['Tables']['quotes']['Row'] & {
  contacts: Database['public']['Tables']['contacts']['Row'] | null;
  team: Database['public']['Tables']['teams']['Row'] | null;
};

/**
 * Funció de servidor per obtenir les dades d'un pressupost (versió manual).
 * @param secureId L'ID únic del pressupost.
 * @returns Les dades del pressupost o null si no es troba.
 */
export async function getQuoteDataBySecureId(secureId: string): Promise<QuoteDataFromServer | null> {
    
    const supabase = createClient();

    // PAS 1: Obtenim el pressupost (sense els items)
    const selectString = "*, contacts (*), team:teams (*)";

    const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select(selectString) 
        .eq("secure_id", secureId)
        // 3. LA CORRECCIÓ: Forcem el tipus de retorn amb .single<T>()
        .single<QuoteWithRelations>(); 

    // Aquesta comprovació de l'error de RUNTIME ara és la clau
    if (quoteError || !quoteData) {
        console.error("Error carregant dades del pressupost (Pas 1):", quoteError?.message || "Dades no trobades");
        // El teu log "content_range: 0-0/*" faria que el codi entrés aquí
        return null;
    }
    
    // Si arribem aquí, 'quoteData' ÉS un objecte.
    // Els errors de TypeScript ('id' no existeix, 'spread'...) desapareixeran.

    // PAS 2: Obtenim els items manualment (Sabem que la RLS d'això funciona)
    const { data: itemsData, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteData.id); // <-- Això ara és segur

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