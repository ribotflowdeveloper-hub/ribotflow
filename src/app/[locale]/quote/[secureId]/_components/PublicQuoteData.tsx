// Al teu fitxer de servidor (p.ex. /quote/[secureId]/page.tsx)
import { createClient } from '@/lib/supabase/server'; 
import type { QuoteDataFromServer } from "@/types/crm"; 
// Importem els tipus de la base de dades (assegura't que la ruta és correcta)
import { type Database } from '@/types/supabase'; 

// Definim el tipus que SÍ esperem al Pas 1
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
        .single<QuoteWithRelations>(); 

    if (quoteError || !quoteData) {
        console.error("Error carregant dades del pressupost (Pas 1):", quoteError?.message || "Dades no trobades");
        return null;
    }
    
    // PAS 2: Obtenim els items manualment (Sabem que la RLS d'això funciona)
    const { data: itemsData, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteData.id);

    if (itemsError) {
        console.error("Pressupost trobat, però error en carregar items (Pas 2):", itemsError.message);
    }

    // PAS 3: Combinem els resultats manualment
    // ✅ --- LA CORRECCIÓ DEFINITIVA ---
    // Canviem el nom de 'quote_items' (BD) a 'items' (React)
    const fullData = {
        ...quoteData,
        items: itemsData || [] // <-- Canviem 'quote_items' per 'items'
    };

    // Fem una petita trampa a TypeScript per unificar els tipus
    return fullData as unknown as QuoteDataFromServer;
}