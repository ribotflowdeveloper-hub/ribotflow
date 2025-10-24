import { QuotesClient } from './QuotesClient';
import { validatePageSession } from "@/lib/supabase/session";
import type { Database } from '@/types/supabase';

// ✅ 1. Definim els tipus necessaris localment, eliminant la dependència amb 'page.tsx'.
type Quote = Database['public']['Tables']['quotes']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];

type QuoteWithContact = Quote & {
  contacts: Pick<Contact, 'nom' | 'empresa'> | null;
};

// Aquest és el tipus de dades que la pàgina realment passa després de validar amb Zod.
// És més segur i explícit.
interface QuotesDataProps {
  searchParams: {
    page: string;
    limit: string;
    query?: string;
    status?: string;
    // Podries afegir aquí altres filtres si els necessites, com dates o sortBy
    // issue_date_from?: string;
    // sortBy?: string;
  };
}

/**
 * Component Server-Side que carrega les dades dels pressupostos.
 */
export async function QuotesData({ searchParams }: QuotesDataProps) {
  try {
    const { supabase, activeTeamId } = await validatePageSession();
    
    // Comencem la consulta base.
    let query = supabase
      .from('quotes')
      .select('*, contacts(nom, empresa)')
      .eq('team_id', activeTeamId);

    // ✅ 2. Apliquem filtres de manera segura i directa.
    if (searchParams.status) {
      const allowedStatuses = ["Draft", "Sent", "Accepted", "Declined", "Invoiced"] as const;
      type Status = typeof allowedStatuses[number];
      const status = allowedStatuses.find(s => s === searchParams.status) as Status | undefined;
      if (status) {
        query = query.eq('status', status);
      }
    }

    if (searchParams.query) {
      // Busca en múltiples camps si és necessari (exemple)
      query = query.or(
        `quote_number.ilike.%${searchParams.query}%,` +
        `contacts.nom.ilike.%${searchParams.query}%`
      );
    }
    
    // Ordenació per defecte (pots fer-la dinàmica si afegeixes sortBy a les props)
    query = query.order('issue_date', { ascending: false });

    // Paginació
    const page = parseInt(searchParams.page, 10);
    const limit = parseInt(searchParams.limit, 10);
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    // ✅ 3. Executem la consulta amb el tipus de retorn esperat.
    const { data: quotes, error } = await query.returns<QuoteWithContact[]>();
    
    if (error) throw error;
    
    // Passem les dades al component client.
    return <QuotesClient initialQuotes={quotes || []} />;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error loading quotes:", errorMessage);
    return <div className="p-8 text-center text-destructive">Error loading quotes.</div>;
  }
}