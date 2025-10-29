// supabase/functions/send-quote-pdf/_lib/dataFetcher.ts (CORREGIT)

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
// Importem també el tipus Team des del fitxer de tipus
import { type FetchedData, type Quote, type Team } from "./types.ts"; 

/**
 * Obté les dades necessàries (pressupost, contacte, NOM DE L'EQUIP) des de Supabase.
 * Valida les dades essencials.
 */
export async function fetchData(supabaseAdmin: SupabaseClient, quoteId: number): Promise<FetchedData> {
  console.log(`Fetching data for quote ID: ${quoteId}`);
  
  const { data: quoteData, error: quoteError } = await supabaseAdmin
    .from('quotes')
    // Important: Ja estem seleccionant team_id aquí
    .select('*, contacts(*), user_id, team_id, secure_id, opportunity_id, quote_number') 
    .eq('id', quoteId)
    .single<Quote>(); 

  if (quoteError) throw new Error(`Error obtenint el pressupost: ${quoteError.message}`);
  if (!quoteData) throw new Error(`El pressupost amb ID ${quoteId} no s'ha trobat.`);

  const { contacts: contact, team_id, quote_number } = quoteData;

  // Validacions crucials (contact, email, team_id) - sense canvis...
  if (!contact) throw new Error(`El pressupost #${quote_number} no té cap contacte assignat.`);
  if (!contact.email) throw new Error(`El contacte '${contact.nom}' no té una adreça d'email definida.`);
  if (!team_id) throw new Error(`El pressupost #${quote_number} no té 'team_id' assignat.`);
  console.log("Quote and contact data retrieved successfully.");

  // ✅ --- CORRECCIÓ: Obtenim el nom de la taula 'teams' ---
  console.log(`Fetching team name for team_id: ${team_id}`);
  const { data: teamData, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('name') // Seleccionem només el nom
    .eq('id', team_id)
    .single<Pick<Team, 'name'>>(); // Tipem la resposta esperada

  if (teamError) {
      console.warn(`Warning: Could not fetch team name for team ${team_id}: ${teamError.message}`);
      // Podem continuar amb un nom per defecte si falla, però és millor saber-ho
  }
  
  // Utilitzem el nom de l'equip; si falla o no existeix, llavors el valor per defecte.
  const companyName = teamData?.name || 'la teva empresa'; 
  console.log("Using company name:", companyName);
  // ❌ Ja no necessitem consultar la taula 'profiles' per això

  return {
    quote: quoteData,
    contact: contact, 
    profile: null, // Ja no necessitem el perfil aquí per al nom
    companyName: companyName,
  };
}