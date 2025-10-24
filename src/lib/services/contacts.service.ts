import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from "@/types/supabase";

const ITEMS_PER_PAGE = 50;

// 1. Tipus que retorna la nostra consulta
export type ContactWithOpportunities = Database['public']['Tables']['contacts']['Row'] & {
  opportunities: Pick<Database['public']['Tables']['opportunities']['Row'], 'id' | 'value'>[] | null;
};

// 2. Opcions de filtre i paginació que accepta la nostra funció
export interface GetContactsOptions {
  teamId: string; // El teamId és obligatori
  page?: number;
  sortBy?: string;
  status?: string;
  searchTerm?: string;
}

// 3. El payload de retorn, que inclou dades de paginació
export interface GetContactsPayload {
  contacts: ContactWithOpportunities[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

/**
 * Obté una llista paginada i filtrada de contactes per a un equip.
 * * @param supabase - Instància del client Supabase
 * @param options - Opcions de filtre, paginació i teamId
 * @returns Un objecte amb 'data' (payload) o 'error'
 */
export async function getPaginatedContacts(
  supabase: SupabaseClient<Database>,
  options: GetContactsOptions
): Promise<{ data: GetContactsPayload | null; error: PostgrestError | null }> {  
  
    // 4. Desestructurem les opcions
  const { teamId, status, searchTerm, sortBy } = options;
  const currentPage = Number(options.page) || 1;
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // 5. Construïm la consulta. Tota la lògica de Supabase viu aquí.
  let query = supabase
    .from('contacts')
    .select('*, opportunities(id, value)', { count: 'exact' })
    // El filtre de 'team_id' és la primera regla, essencial per seguretat.
    .eq('team_id', teamId); 

  if (searchTerm) {
    query = query.or(`nom.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }
  if (status && status !== 'all') {
    query = query.eq('estat', status);
  }
  
  if (sortBy === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else {
    // Per defecte, els més nous primer
    query = query.order('created_at', { ascending: false });
  }
  
  query = query.range(from, to);

  // 6. Executem la consulta
  const { data: contacts, error, count } = await query;

  if (error) {
    console.error("Error a getPaginatedContacts (service):", error.message);
    return { data: null, error };
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // 7. Retornem el payload
  return {
    data: {
      contacts: contacts as ContactWithOpportunities[] || [],
      totalPages,
      currentPage,
      totalCount
    },
    error: null
  };
}

/**
 * Obté una llista bàsica de contactes (ID i nom) per un equip.
 * Ideal per a dropdowns o selectors.
 */
export async function getBasicContacts(supabase: SupabaseClient<Database>, teamId: string) {
  return supabase
    .from('contacts')
    .select('id, nom')
    .eq('team_id', teamId);
}


export async function getAllContacts(
  supabase: SupabaseClient<Database>, 
  teamId: string
) {
  return supabase
    .from('contacts')
    .select('*')
    .eq('team_id', teamId);
}