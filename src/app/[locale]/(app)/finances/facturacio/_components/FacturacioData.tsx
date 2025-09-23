import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FacturacioClient } from './FacturacioClient';
import type { Invoice, Contact } from '../types'; 
import type { Product } from '@/types/crm/products'; 

export async function FacturacioData({
    status,
    sortBy,
    order
}: {
    status?: string;
    sortBy?: string;
    order?: string;
}) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // --- LÒGICA D'EQUIP ---
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();
        
    if (memberError || !member) {
        console.error("Usuari sense equip intentant accedir a facturació:", user.id, memberError);
        return <FacturacioClient initialInvoices={[]} initialContacts={[]} initialProducts={[]} />;
    }
    const teamId = member.team_id;
    // ----------------------

    // ✅ Filtrem la consulta principal per 'team_id'
    let query = supabase
        .from('invoices')
        .select('*, contacts(id, nom), invoice_items(*)')
        .eq('team_id', teamId);

    if (status) {
        query = query.eq('status', status);
    }

    if (sortBy && (order === 'asc' || order === 'desc')) {
        const ascending = order === 'asc';
        if (sortBy.includes('.')) {
            const [referencedTable, referencedColumn] = sortBy.split('.');
            query = query.order(referencedColumn, { referencedTable, ascending });
        } else {
            query = query.order(sortBy, { ascending });
        }
    } else {
        query = query.order('issue_date', { ascending: false });
    }

    // ✅ Filtrem també les dades auxiliars (contactes, productes) per l'equip
    const [invoicesRes, contactsRes, productsRes] = await Promise.all([
        query,
        supabase.from('contacts').select('id, nom').eq('team_id', teamId),
        supabase.from('products').select('*').eq('team_id', teamId).eq('is_active', true)
    ]);

    if (invoicesRes.error || contactsRes.error || productsRes.error) {
        console.error("Error al carregar dades de facturació:", invoicesRes.error || contactsRes.error || productsRes.error);
    }

    const invoices = invoicesRes.data as Invoice[] || [];
    const contacts = contactsRes.data as Contact[] || [];
    const products = productsRes.data as Product[] || [];

    return <FacturacioClient initialInvoices={invoices} initialContacts={contacts} initialProducts={products} />;
}

