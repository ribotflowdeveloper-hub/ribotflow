// src/lib/data/dashboard.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/types/supabase';
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';

// ✅ CORRECCIÓ 1: Definim el nou tipus per a les variants de color, que faltava.
export type ServerActivityVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

export type ServerActivityIcon = 'fileWarning' | 'checkCircle' | 'clock' | 'users';

// ✅ CORRECCIÓ 2: Actualitzem el tipus principal per utilitzar `variant` en lloc de `tone`.
export type ServerActivityItem = {
  icon: ServerActivityIcon;
  variant: ServerActivityVariant; // Canviat de 'tone' a 'variant'
  title: string;
  meta: string;
  href: string;
  date: string | null;
};

// --- La resta de funcions per obtenir dades (getStats, getTasks, etc.) es mantenen igual ---
type DashboardStats = {
    total_contacts: number; active_clients: number; opportunities: number; invoiced_current_month: number;
    invoiced_previous_month: number; pending_total: number; expenses_current_month: number; expenses_previous_month: number;
};
export const getStats = async (supabase: SupabaseClient<Database> ): Promise<DashboardStats> => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) { console.error('Error fetching dashboard stats:', error); return { total_contacts: 0, active_clients: 0, opportunities: 0, invoiced_current_month: 0, invoiced_previous_month: 0, pending_total: 0, expenses_current_month: 0, expenses_previous_month: 0 }; }
    return data?.[0] || { total_contacts: 0, active_clients: 0, opportunities: 0, invoiced_current_month: 0, invoiced_previous_month: 0, pending_total: 0, expenses_current_month: 0, expenses_previous_month: 0 };
};
export const getTasks = async (supabase: SupabaseClient<Database>, teamId: string): Promise<EnrichedTask[]> => {
    const { data, error } = await supabase.from('tasks').select('*, contacts(id, nom), departments(id, name), profiles:user_asign_id (id, full_name, avatar_url)').eq('team_id', teamId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching tasks:', error); return []; }
    return data as unknown as EnrichedTask[];
};
export const getOverdueInvoices = async (
    supabase: SupabaseClient<Database>, 
    teamId: string // <-- 1. AFEGIM EL PARÀMETRE
): Promise<(Tables<'invoices'> & { contacts: { nom: string } | null })[]> => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, contacts(nom)')
        .eq('team_id', teamId) // <-- 2. AFEGIM EL FILTRE
        .in('status', ['Sent', 'Overdue'])
        .lt('due_date', new Date().toISOString());
        
    if (error) { console.error('Error fetching overdue invoices:', error); return []; }
    return data ?? [];
};
export const getRecentContacts = async (supabase: SupabaseClient<Database>, teamId: string): Promise<Tables<'contacts'>[]> => {
    const { data, error } = await supabase.from('contacts').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching recent contacts:', error); return []; }
    return data ?? [];
};
// --- Fi de les funcions que no canvien ---


export const getRecentActivities = (
    invoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[],
    tasks: EnrichedTask[],
    contacts: Tables<'contacts'>[]
): ServerActivityItem[] => {
    const activities: ServerActivityItem[] = [];

    invoices.slice(0, 7).forEach(inv => {
        if (inv.due_date) {
            activities.push({
                icon: 'fileWarning',
                variant: 'danger', // ✅ CORRECCIÓ 3: Assignem la variant correcta
                title: `Factura vençuda: ${inv.contacts?.nom ?? 'client'}`,
                meta: `Vencia el ${new Date(inv.due_date).toLocaleDateString()}`,
                href: '/finances/facturacio',
                date: inv.due_date
            });
        }
    });

    tasks.slice(0, 7).forEach(task => {
        if (task.created_at) {
            activities.push({
                icon: task.is_completed ? 'checkCircle' : 'clock',
                variant: task.is_completed ? 'success' : 'warning', // ✅ CORRECCIÓ 3
                title: task.title,
                meta: `Tasca creada el ${new Date(task.created_at).toLocaleDateString()}`,
                href: '/dashboard', // Pots canviar-ho per l'URL específica de la tasca si vols
                date: task.created_at
            });
        }
    });

    contacts.slice(0, 7).forEach(c => {
        if (c.created_at) {
            activities.push({
                icon: 'users',
                variant: 'info', // ✅ CORRECCIÓ 3
                title: `Nou contacte: ${c.nom}`,
                meta: `Afegit el ${new Date(c.created_at).toLocaleDateString()}`,
                href: `/crm/contactes/${c.id}`,
                date: c.created_at
            });
        }
    });

    return activities
        .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
        .slice(0, 15);
};