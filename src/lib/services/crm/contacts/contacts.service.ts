import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from "@/types/supabase";
import type { 
    Contact, 
    DbTableInsert, 
    DbTableUpdate, 
    ContactForSupplier,
    Supplier,
    Quote,
    Opportunity,
    Invoice,
    Activity
} from '@/types/db';

// Constants
const ITEMS_PER_PAGE = 50;

// --- TIPUS ---

// ✅ 1. Nou tipus: Oportunitat amb el nom de l'etapa (JOIN)
export type OpportunityWithStage = Opportunity & {
    pipeline_stages: { name: string } | null;
};

export type ContactWithOpportunities = Contact & {
    opportunities: { id: number; value: number | null }[]; 
};

export type ContactDetail = Contact & {
    suppliers: Pick<Supplier, 'id' | 'nom'> | null;
};

// ✅ 2. Actualitzem ContactRelatedData per utilitzar el nou tipus
export type ContactRelatedData = {
    quotes: Quote[];
    opportunities: OpportunityWithStage[]; // <-- Abans era Opportunity[]
    invoices: Invoice[];
    activities: Activity[];
};

// Tipus de retorn per a la paginació
export interface GetContactsPayload {
    contacts: ContactWithOpportunities[];
    totalPages: number;
    currentPage: number;
    totalCount: number;
}

export interface GetContactsOptions {
    teamId: string;
    page?: number;
    sortBy?: string;
    status?: string;
    searchTerm?: string;
}

// ==========================================
// 📖 FUNCIONS DE LECTURA (READ)
// ==========================================

/**
 * Obté una llista paginada de contactes amb filtres.
 */
export async function getPaginatedContacts(
    supabase: SupabaseClient<Database>,
    options: GetContactsOptions
): Promise<GetContactsPayload> {
    const { teamId, status, searchTerm, sortBy } = options;
    const currentPage = Math.max(1, Number(options.page) || 1);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
        .from('contacts')
        .select('*, opportunities(id, value)', { count: 'exact' })
        .eq('team_id', teamId);

    // Filtres
    if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    
    if (status && status !== 'all') {
        // 'as any' per evitar conflictes estrictes amb Enums de la BD en temps de compilació
        query = query.eq('estat', status as string); 
    }

    // Ordenació
    if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    // Paginació
    const { data, error, count } = await query.range(from, to);

    if (error) {
        console.error("Service Error (getPaginatedContacts):", error.message);
        throw new Error(`Error carregant contactes: ${error.message}`);
    }

    return {
        contacts: (data as unknown as ContactWithOpportunities[]) || [],
        totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
        currentPage,
        totalCount: count || 0
    };
}

/**
 * ✅ RESTAURADA: Obté tots els contactes d'un equip (per selectors, etc.)
 */
export async function getAllContacts(
    supabase: SupabaseClient<Database>, 
    teamId: string
): Promise<Contact[]> {
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('team_id', teamId)
        .order('nom', { ascending: true });

    if (error) {
        console.error("Error getAllContacts:", error.message);
        throw new Error("No s'han pogut carregar els contactes.");
    }
    
    return data || [];
}

/**
 * Cerca contactes per vincular (autocompletat).
 */
export async function searchContactsForLinking(
    supabase: SupabaseClient<Database>, 
    teamId: string, 
    searchTerm: string
): Promise<Pick<Contact, "id" | "nom" | "email">[]> {
    let query = supabase
        .from("contacts")
        .select("id, nom, email")
        .eq("team_id", teamId)
        .is("supplier_id", null)
        .limit(10);

    if (searchTerm) { 
        query = query.ilike("nom", `%${searchTerm}%`); 
    }
    
    const { data, error } = await query;
    if (error) return [];
    return data || [];
}

/**
 * Obté contactes associats a un proveïdor.
 */
export async function fetchContactsForSupplier(
    supabase: SupabaseClient<Database>, 
    supplierId: string, 
    teamId: string
): Promise<ContactForSupplier[]> {
    const { data, error } = await supabase
        .from("contacts")
        .select("id, nom, email, telefon")
        .eq("supplier_id", supplierId)
        .eq("team_id", teamId)
        .order("nom", { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Obté el detall d'un únic contacte.
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
        // Codi PGRST116 = cap fila trobada (el contacte no existeix o s'ha esborrat)
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error("Error fetching contact detail:", error.message);
        return null; 
    }

    return data as unknown as ContactDetail;
}

/**
 * ✅ Obté dades relacionades, INCLOENT EL NOM DE L'ETAPA (Pipeline Stage)
 */
export async function getContactRelatedData(
    supabase: SupabaseClient<Database>, 
    contactId: number, 
    teamId: string // ✅ CORRECCIÓ: Afegit teamId que faltava a la signatura anterior
): Promise<ContactRelatedData> {
    const [quotesRes, oppsRes, invoicesRes, activitiesRes] = await Promise.all([
        supabase.from('quotes').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false }),
        
        // ✅ AQUÍ ESTÀ LA CLAU: Fem JOIN amb pipeline_stages per obtenir el 'name'
        supabase.from('opportunities')
            .select('*, pipeline_stages(name)') 
            .eq('contact_id', contactId)
            .eq('team_id', teamId)
            .order('created_at', { ascending: false }),
            
        supabase.from('invoices').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false }),
        supabase.from('activities').select('*').eq('contact_id', contactId).eq('team_id', teamId).order('created_at', { ascending: false })
    ]);
    
    return {
        quotes: (quotesRes.data as Quote[]) || [],
        // TypeScript ara entén que això inclou pipeline_stages gràcies al select
        opportunities: (oppsRes.data as unknown as OpportunityWithStage[]) || [], 
        invoices: (invoicesRes.data as Invoice[]) || [],
        activities: (activitiesRes.data as Activity[]) || []
    };
}

// ==========================================
// ✍️ FUNCIONS D'ESCRIPTURA (WRITE)
// ==========================================

export async function createContact(
    supabase: SupabaseClient<Database>, 
    formData: FormData, 
    userId: string, 
    teamId: string
): Promise<Contact> {
    const nom = formData.get("nom") as string;
    const email = formData.get("email") as string;
    const valorRaw = formData.get("valor");

    if (!nom || !email) { 
        throw new Error("El nom i l'email són obligatoris."); 
    }

    const newContact: DbTableInsert<'contacts'> = {
        nom,
        email,
        empresa: formData.get("empresa") as string || null,
        telefon: formData.get("telefon") as string || null,
        estat: (formData.get("estat") as string) || "Lead", // 'as any' per seguretat amb l'Enum
        valor: valorRaw ? parseFloat(valorRaw.toString()) : 0,
        team_id: teamId,
        user_id: userId,
    };

    const { data, error } = await supabase
        .from("contacts")
        .insert(newContact)
        .select()
        .single();

    if (error) {
        if (error.code === '23505') throw new Error("Aquest email ja existeix a l'equip.");
        throw new Error(error.message);
    }

    return data;
}

export async function updateContact(
    supabase: SupabaseClient<Database>,
    contactId: number,
    teamId: string,
    formData: FormData
): Promise<ContactDetail> {
    const hobbiesValue = formData.get('hobbies') as string;
    const supplierId = formData.get('supplier_id') as string;
    const birthdayValue = formData.get('birthday') as string;

    const dataToUpdate: DbTableUpdate<'contacts'> = {
        nom: formData.get('nom') as string,
        supplier_id: supplierId || null, 
        email: formData.get('email') as string,
        telefon: formData.get('telefon') as string,
        estat: formData.get('estat') as string, // ✅ CORRECCIÓ: Cast a 'string' per evitar l'error de string vs Enum
        job_title: formData.get('job_title') as string,
        industry: formData.get('industry') as string,
        lead_source: formData.get('lead_source') as string,
        birthday: birthdayValue ? birthdayValue : null, 
        notes: formData.get('notes') as string,
        children_count: formData.get('children_count') ? parseInt(formData.get('children_count') as string, 10) : null,
        partner_name: formData.get('partner_name') as string,
        // Gestió d'arrays i JSON
        hobbies: hobbiesValue ? hobbiesValue.split(',').map(item => item.trim()) : [],
        address: {
            city: formData.get('address.city') as string,
        },
        social_media: {
            linkedin: formData.get('social_media.linkedin') as string,
        }
    };

    // Si canviem el proveïdor, actualitzem el nom de l'empresa denormalitzada
    if (dataToUpdate.supplier_id) {
        const { data: supplierData } = await supabase
            .from("suppliers")
            .select("nom")
            .eq("id", dataToUpdate.supplier_id)
            .eq("team_id", teamId)
            .single();
            
        if (supplierData) {
            dataToUpdate.empresa = supplierData.nom;
        }
    } 

    const { data, error } = await supabase
        .from('contacts')
        .update(dataToUpdate)
        .eq('id', contactId)
        .eq('team_id', teamId)
        .select(`*, suppliers (id, nom)`)
        .single();

    if (error) {
        console.error("Error updating contact:", error);
        throw new Error(error.message);
    }
    
    return data as unknown as ContactDetail;
}

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
        console.error("Error deleting contact:", error);
        throw new Error("No s'ha pogut eliminar el contacte.");
    }
}

export async function linkContactToSupplier(
    supabase: SupabaseClient<Database>,
    contactId: number,
    supplierId: string,
    teamId: string
): Promise<Contact> {
    const { data: supplier } = await supabase
        .from('suppliers')
        .select('nom')
        .eq('id', supplierId)
        .single();

    if (!supplier) throw new Error("Proveïdor no trobat");

    const updateData: DbTableUpdate<'contacts'> = {
        supplier_id: supplierId,
        estat: 'Proveidor' as string, 
        empresa: supplier.nom
    };

    const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .eq('team_id', teamId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function unlinkContactFromSupplier(
    supabase: SupabaseClient<Database>,
    contactId: number,
    teamId: string
): Promise<void> {
    const { error } = await supabase
        .from('contacts')
        .update({ supplier_id: null, estat: 'Lead' as string, empresa: null })
        .eq('id', contactId)
        .eq('team_id', teamId);

    if (error) throw error;
}