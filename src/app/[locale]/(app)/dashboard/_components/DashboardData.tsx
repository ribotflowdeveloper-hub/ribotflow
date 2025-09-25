import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { DashboardClient } from '../dashboard-client';
import type { Contact, Invoice, Task, Notification } from '@/types/crm';
import React from 'react';

const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) > 999) return change > 0 ? '+999%' : '-999%';
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

export async function DashboardData({ children }: { children: React.ReactNode }) {
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Esta redirección es correcta, por si un usuario no autenticado intenta acceder
        return redirect(`/${locale}/login`);
    }
    
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ✅ Les consultes ara són segures. La RLS filtrarà 'tasks', 'invoices', i 'contacts'.
    // La funció RPC 'get_dashboard_stats' ara també filtra internament.
    const [statsRes, tasksRes, overdueInvoicesRes, contactsRes, notificationsRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'), 
        supabase.from('tasks').select('*').order('is_completed, created_at'),
        supabase.from('invoices').select('*, contacts(nom)').in('status', ['Sent', 'Overdue']).lt('due_date', new Date().toISOString()),
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false),
    ]);
    
    
    const statsData = statsRes.data?.[0] || {};
    const contactsData = (contactsRes.data as Contact[]) || [];
    const transformedOverdueInvoices = ((overdueInvoicesRes.data as Invoice[]) || []).map(invoice => ({
        ...invoice,
        contacts: Array.isArray(invoice.contacts) ? invoice.contacts[0] : invoice.contacts
    }));

    const initialData = {
        stats: {
            totalContacts: statsData.total_contacts || 0,
            activeClients: statsData.active_clients || 0,
            opportunities: statsData.opportunities || 0,
            invoiced: statsData.invoiced_current_month || 0,
            pending: statsData.pending_total || 0,
            expenses: statsData.expenses_current_month || 0,
            invoicedChange: calculatePercentageChange(statsData.invoiced_current_month || 0, statsData.invoiced_previous_month || 0),
            expensesChange: calculatePercentageChange(statsData.expenses_current_month || 0, statsData.expenses_previous_month || 0),
            invoicedIsPositive: (statsData.invoiced_current_month || 0) >= (statsData.invoiced_previous_month || 0),
            expensesIsPositive: (statsData.expenses_current_month || 0) <= (statsData.expenses_previous_month || 0),
        },
        tasks: (tasksRes.data as Task[]) || [],
        contacts: contactsData,
        overdueInvoices: transformedOverdueInvoices,
        attentionContacts: contactsData
            .filter((c: Contact) => c.last_interaction_at && new Date(c.last_interaction_at) < sevenDaysAgo)
            .slice(0, 5),
        notifications: (notificationsRes.data as Notification[]) || [],
    };

    return (
        <DashboardClient initialData={initialData}>
            {children}
        </DashboardClient>
    );
}
