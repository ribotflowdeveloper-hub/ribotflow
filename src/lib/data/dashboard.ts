// src/lib/data/dashboard.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/types/supabase';
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';

export type ServerActivityIcon = 'fileWarning' | 'checkCircle' | 'clock' | 'users';

export type ServerActivityItem = {
  icon: ServerActivityIcon;
  tone: { bg: string; text: string };
  title: string;
  meta: string;
  href: string;
  date: string | null;
};

// ... (la resta de tipus i funcions de getStats, getTasks, etc. no canvien)
type DashboardStats = {
    total_contacts: number; active_clients: number; opportunities: number; invoiced_current_month: number;
    invoiced_previous_month: number; pending_total: number; expenses_current_month: number; expenses_previous_month: number;
};
export const getStats = async (supabase: SupabaseClient<Database>): Promise<DashboardStats> => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) { console.error('Error fetching dashboard stats:', error); return { total_contacts: 0, active_clients: 0, opportunities: 0, invoiced_current_month: 0, invoiced_previous_month: 0, pending_total: 0, expenses_current_month: 0, expenses_previous_month: 0 }; }
    return data?.[0] || { total_contacts: 0, active_clients: 0, opportunities: 0, invoiced_current_month: 0, invoiced_previous_month: 0, pending_total: 0, expenses_current_month: 0, expenses_previous_month: 0 };
};
export const getTasks = async (supabase: SupabaseClient<Database>, teamId: string): Promise<EnrichedTask[]> => {
    const { data, error } = await supabase.from('tasks').select('*, contacts(id, nom), departments(id, name), profiles:user_asign_id (id, full_name, avatar_url)').eq('team_id', teamId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching tasks:', error); return []; }
    return data as unknown as EnrichedTask[];
};
export const getOverdueInvoices = async (supabase: SupabaseClient<Database>): Promise<(Tables<'invoices'> & { contacts: { nom: string } | null })[]> => {
    const { data, error } = await supabase.from('invoices').select('*, contacts(nom)').in('status', ['Sent', 'Overdue']).lt('due_date', new Date().toISOString());
    if (error) { console.error('Error fetching overdue invoices:', error); return []; }
    return data ?? [];
};
export const getRecentContacts = async (supabase: SupabaseClient<Database>, teamId: string): Promise<Tables<'contacts'>[]> => {
    const { data, error } = await supabase.from('contacts').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching recent contacts:', error); return []; }
    return data ?? [];
};

export const getRecentActivities = (
    invoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[],
    tasks: EnrichedTask[],
    contacts: Tables<'contacts'>[]
): ServerActivityItem[] => {
    const activities: ServerActivityItem[] = [];

    // ✅ CORRECCIÓ: Augmentem el límit per recollir més dades de cada tipus
    invoices.slice(0, 7).forEach(inv => {
        if (inv.due_date) {
            activities.push({
                icon: 'fileWarning',
                tone: { bg: 'bg-destructive/10', text: 'text-destructive' },
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
                tone: { bg: task.is_completed ? 'bg-success/10' : 'bg-yellow-500/10', text: task.is_completed ? 'text-success' : 'text-yellow-600' },
                title: task.title,
                meta: `Tasca creada el ${new Date(task.created_at).toLocaleDateString()}`,
                href: '/dashboard',
                date: task.created_at
            });
        }
    });

    contacts.slice(0, 7).forEach(c => {
        if (c.created_at) {
            activities.push({
                icon: 'users',
                tone: { bg: 'bg-primary/10', text: 'text-primary' },
                title: `Nou contacte: ${c.nom}`,
                meta: `Afegit el ${new Date(c.created_at).toLocaleDateString()}`,
                href: `/crm/contactes/${c.id}`,
                date: c.created_at
            });
        }
    });

    return activities
        .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
        // ✅ CORRECCIÓ: Eliminem el .slice(0, 5) per enviar més dades al client.
        // Podem posar un límit superior per seguretat, per exemple, 15.
        .slice(0, 15);
};