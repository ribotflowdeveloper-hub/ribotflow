// src/lib/services/crm/contacts/contacts.service.ts

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from "@/types/supabase";
import type { 
    Contact, 
    DbTableInsert, 
    DbTableUpdate, 
    Supplier,
    Quote,
    Opportunity,
    Invoice,
    Activity 
} from '@/types/db';

const ITEMS_PER_PAGE = 50;

// --- Tipus de Retorn del Servei ---

export type ContactWithOpportunities = Contact & {
  opportunities: Pick<Database['public']['Tables']['opportunities']['Row'], 'id' | 'value'>[] | null;
};

export interface GetContactsOptions {
  teamId: string;
  page?: number;
  sortBy?: string;
  status?: string;
  searchTerm?: string;
}

export interface GetContactsPayload {
  contacts: ContactWithOpportunities[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

// ✅ NOU: Tipus de detall que inclou el proveïdor (pel JOIN)
export type ContactDetail = Omit<Contact, 'suppliers'> & {
  suppliers: Pick<Supplier, 'id' | 'nom'> | null;
};

// ✅ NOU: Tipus per a les dades relacionades
export type ContactRelatedData = {
  quotes: Quote[];
  opportunities: Opportunity[];
  invoices: Invoice[];
  activities: Activity[];
};


// ---
// ⚙️ FUNCIONS DE LECTURA (Totes centralitzades aquí)
// ---

// ... (Pego aquí les funcions que ja teníem del pas anterior) ...

export async function getPaginatedContacts(
  supabase: SupabaseClient<Database>,
  options: GetContactsOptions
): Promise<{ data: GetContactsPayload | null; error: PostgrestError | null }> { 
    // ... (lògica de getPaginatedContacts)
    const { teamId, status, searchTerm, sortBy } = options;
    const currentPage = Number(options.page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('contacts')
      .select('*, opportunities(id, value)', { count: 'exact' })
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
      query = query.order('created_at', { ascending: false });
    }
    query = query.range(from, to);

    const { data: contacts, error, count } = await query;

    if (error) {
      console.error("Error a getPaginatedContacts (service):", error.message);
      return { data: null, error };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
export async function getAllContacts(supabase: SupabaseClient<Database>, teamId: string): Promise<Contact[]> {
  const { data, error } = await supabase.from('contacts').select('*').eq('team_id', teamId);
  if (error) { throw new Error("No s'han pogut carregar els contactes."); }
  return data || [];
}
export async function fetchContactsList(supabase: SupabaseClient<Database>, teamId: string): Promise<Partial<Contact>[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select(`id, nom, email, telefon, estat, empresa, valor`)
    .eq('team_id', teamId)
    .order("nom", { ascending: true });
  if (error) { throw new Error("No s'han pogut carregar la llista de contactes."); }
  return data || [];
}
export type ContactForSupplier = { id: number; nom: string; email: string | null; telefon: string | null; };
export async function fetchContactsForSupplier(supabase: SupabaseClient<Database>, supplierId: string, teamId: string): Promise<ContactForSupplier[]> { 
  const { data, error } = await supabase
    .from("contacts")
    .select("id, nom, email, telefon") 
    .eq("supplier_id", supplierId)
    .eq("team_id", teamId)
    .order("nom", { ascending: true });
  if (error) { throw new Error("Error en carregar els contactes del proveïdor."); }
  return (data as ContactForSupplier[]) || []; 
}
export async function searchContactsForLinking(supabase: SupabaseClient<Database>, teamId: string, searchTerm: string): Promise<Pick<Contact, "id" | "nom" | "email">[]> {
  let query = supabase.from("contacts").select("id, nom, email").eq("team_id", teamId).is("supplier_id", null).limit(10);
  if (searchTerm) { query = query.ilike("nom", `%${searchTerm}%`); }
  const { data, error } = await query;
  if (error) { return []; }
  return data || [];
}

// ---
// ⚙️ NOVES FUNCIONS DE LECTURA (per a la pàgina de detall)
// ---

/**
 * SERVEI: Obté el detall d'un contacte, incloent l'empresa (supplier) associada.
 */
export async function fetchContactDetail(
    supabase: SupabaseClient<Database>, 
    contactId: number, 
    teamId: string
): Promise<ContactDetail | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select(`
      *, 
      suppliers (id, nom)
    `)
    .eq("id", contactId)
    .eq("team_id", teamId)
    .single();

  if (error) {
    console.error("Error fetching contact detail (service):", error.message);
    return null; // El component de dades gestionarà el notFound()
  }
  return data as unknown as ContactDetail;
}

/**
 * SERVEI: Obté totes les dades relacionades (factures, oportunitats, etc.) d'un contacte.
 */
export async function getContactRelatedData(
    supabase: SupabaseClient<Database>, 
    contactId: number, 
    teamId: string
): Promise<ContactRelatedData> {
    const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
        supabase.from('quotes').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false }),
        supabase.from('opportunities').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false }),
        supabase.from('activities').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false })
    ]);
    
    return {
        quotes: (quotesRes.data as Quote[]) || [],
        opportunities: (oppsRes.data as Opportunity[]) || [],
        invoices: (invoicesRes.data as Invoice[]) || [],
        activities: (activitiesRes.data as Activity[]) || []
    };
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (Centralitzades)
// ---

// ... (createContact, linkContactToSupplier, unlinkContactFromSupplier del pas anterior) ...
export async function createContact(supabase: SupabaseClient<Database>, formData: FormData, userId: string, activeTeamId: string): Promise<Contact> {
  // ... (lògica de createContact)
  const nom = formData.get("nom") as string;
  const email = formData.get("email") as string;
  if (!nom || !email) { throw new Error("El nom i l'email són obligatoris."); }
  const dataToInsert: DbTableInsert<'contacts'> = {
    nom, email,
    empresa: formData.get("empresa") as string,
    telefon: formData.get("telefon") as string,
    estat: formData.get("estat") as Contact['estat'],
    valor: parseFloat(formData.get("valor") as string) || 0,
    team_id: activeTeamId, user_id: userId,
  };
  const { data, error } = await supabase.from("contacts").insert(dataToInsert).select().single();
  if (error) { throw new Error(error.message); }
  return data as Contact;
}
export async function linkContactToSupplier(supabase: SupabaseClient<Database>, contactId: number, supplierId: string, activeTeamId: string): Promise<Contact> {
  // ... (lògica de linkContactToSupplier)
  const { data: supplierData, error: supplierError } = await supabase.from("suppliers").select("nom").eq("id", supplierId).eq("team_id", activeTeamId).single();
  if (supplierError || !supplierData) { throw new Error("No s'ha pogut trobar el proveïdor."); }
  const supplierName = (supplierData as Supplier).nom;
  const updateData: DbTableUpdate<'contacts'> = { supplier_id: supplierId, estat: "Proveidor", empresa: supplierName };
  const { data, error } = await supabase.from("contacts").update(updateData).eq("id", contactId).eq("team_id", activeTeamId).select().single();
  if (error) { throw new Error(`Error en vincular el contacte: ${error.message}`); }
  return data as Contact;
}
export async function unlinkContactFromSupplier(supabase: SupabaseClient<Database>, contactId: number, activeTeamId: string): Promise<void> {
  // ... (lògica de unlinkContactFromSupplier)
  const updateData: DbTableUpdate<'contacts'> = { supplier_id: null, estat: "Lead", empresa: null };
  const { error } = await supabase.from("contacts").update(updateData).eq("id", contactId).eq("team_id", activeTeamId);
  if (error) { throw new Error(`Error en desvincular el contacte: ${error.message}`); }
}


/**
 * SERVEI: Actualitza un contacte.
 * Llança un error si falla.
 */
export async function updateContact(
    supabase: SupabaseClient<Database>,
    contactId: number,
    teamId: string,
    formData: FormData
): Promise<ContactDetail> {
    const hobbiesValue = formData.get('hobbies') as string;
    const supplierId = formData.get('supplier_id') as string;
    
    // ✅ BUG FIX: Gestionem explícitament string buit per a 'birthday'
    const birthdayValue = formData.get('birthday') as string;

    const dataToUpdate: DbTableUpdate<'contacts'> = {
        nom: formData.get('nom') as string,
        supplier_id: supplierId || null, 
        email: formData.get('email') as string,
        telefon: formData.get('telefon') as string,
        estat: formData.get('estat') as Contact['estat'],
        job_title: formData.get('job_title') as string,
        industry: formData.get('industry') as string,
        lead_source: formData.get('lead_source') as string,
        // ✅ BUG FIX: Si birthdayValue és "", desa NULL.
        birthday: birthdayValue ? birthdayValue : null, 
        notes: formData.get('notes') as string,
        children_count: formData.get('children_count') ? parseInt(formData.get('children_count') as string, 10) : null,
        partner_name: formData.get('partner_name') as string,
        hobbies: hobbiesValue ? hobbiesValue.split(',').map(item => item.trim()) : [],
        address: {
            city: formData.get('address.city') as string,
        },
        social_media: {
            linkedin: formData.get('social_media.linkedin') as string,
        }
    };

    // ... (lògica per actualitzar 'empresa' si 'supplier_id' canvia) ...
    if (dataToUpdate.supplier_id) {
        const { data: supplierData } = await supabase
            .from("suppliers").select("nom").eq("id", dataToUpdate.supplier_id)
            .eq("team_id", teamId).single();
        if (supplierData) {
            dataToUpdate.empresa = supplierData.nom;
        }
    } else {
        dataToUpdate.empresa = null;
    }

    const { data, error } = await supabase
        .from('contacts')
        .update(dataToUpdate)
        .eq('id', contactId)
        .eq('team_id', teamId)
        .select(`*, suppliers (id, nom)`)
        .single();

    if (error) {
        console.error("Error updating contact (service):", error);
        throw new Error(error.message);
    }
    return data as unknown as ContactDetail;
}

/**
 * SERVEI: Elimina un contacte.
 * Llança un error si falla.
 */
export async function deleteContact(
    supabase: SupabaseClient<Database>,
    contactId: number,
    teamId: string
): Promise<void> {
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('team_id', teamId);

  	if (error) {
      	console.error("Error deleting contact (service):", error);
      	throw new Error("No s'ha pogut eliminar el contacte.");
  	}
}