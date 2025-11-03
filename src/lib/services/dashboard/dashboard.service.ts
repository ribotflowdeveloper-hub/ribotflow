// src/lib/services/dashboard.service.ts

import { type SupabaseClient, type User, type PostgrestError } from '@supabase/supabase-js';
import { type Database, type Tables } from '@/types/supabase';
import { type EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { type EnrichedQuote } from '@/app/[locale]/(app)/dashboard/_components/RecentQuotes';
import { type EnrichedEmail } from '@/app/[locale]/(app)/dashboard/_components/RecentEmails';
import { type ServerActivityItem } from '@/lib/data/dashboard';
export type { EnrichedTask, EnrichedQuote, EnrichedEmail };
// Importem els tipus de la nostra font de la veritat
import type { DbTableInsert,  Department } from '@/types/db';
import type { NewTaskPayload } from '@/types/dashboard/types';

import {
    getStats as fetchStats,
    getTasks as fetchTasks,
    getOverdueInvoices as fetchOverdueInvoices,
    getRecentContacts as fetchRecentContacts,
    getRecentActivities,
} from '@/lib/data/dashboard';

// --- Tipus de Dades Retornades pel Servei ---
export type DashboardInitialData = {
    stats: {
        totalContacts: number;
        activeClients: number;
        opportunities: number;
        invoiced: number;
        pending: number;
        expenses: number;
        invoicedChange: string;
        expensesChange: string;
        invoicedIsPositive: boolean;
        expensesIsPositive: boolean;
    };
    tasks: EnrichedTask[];
    departments: Tables<'departments'>[];
    contacts: Tables<'contacts'>[]; // Contactes recents per a 'attentionContacts'
    overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
    attentionContacts: Tables<'contacts'>[];
    notifications: Tables<'notifications'>[];
    recentActivities: ServerActivityItem[]; // Activitats ja processades
    recentQuotes: EnrichedQuote[];
    recentEmails: EnrichedEmail[];
    teamMembers: Tables<'team_members_with_profiles'>[]; // Afegim teamMembers aquí
};

// Tipus per a errors detallats
export type DashboardDataError = {
    permissionsError?: PostgrestError | null;
    statsError?: unknown;
    tasksError?: unknown;
    overdueInvoicesError?: unknown;
    contactsError?: unknown; // Canviat de PostgrestError a unknown
    notificationsError?: PostgrestError | null;
    departmentsError?: PostgrestError | null;
    teamMembersError?: PostgrestError | null;
    recentQuotesError?: PostgrestError | null;
    recentEmailsError?: PostgrestError | null;
};

// --- Helpers ---
const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

/**
 * Obté i processa les dades inicials per al Dashboard principal.
 */
export async function getDashboardInitialData(
    supabase: SupabaseClient<Database>,
    user: User,
    teamId: string
): Promise<{ data: DashboardInitialData | null; error: DashboardDataError | { message: string, details?: unknown } | null }> {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Obtenir permisos
        const { data: permissions, error: permissionsError } = await supabase
            .from('inbox_permissions')
            .select('target_user_id')
            .eq('team_id', teamId)
            .eq('grantee_user_id', user.id);

        if (permissionsError) {
            console.error(`🚨 Error en la consulta "permissions":`, permissionsError);
            throw new Error(`Error carregant permisos: ${permissionsError.message}`);
        }
        const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id).filter(Boolean) || [])];

        // 2. Executar consultes en paral·lel
        const results = await Promise.allSettled([
            fetchStats(supabase), // 0
            fetchTasks(supabase, teamId), // 1
            fetchOverdueInvoices(supabase, teamId), // 2
            fetchRecentContacts(supabase, teamId), // 3
            supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false), // 4
            supabase.from('departments').select('*').eq('team_id', teamId), // 5
            supabase.from('team_members_with_profiles').select('*').eq('team_id', teamId), // 6
            supabase.from('quotes').select('*, contacts(nom)').eq('team_id', teamId).order('created_at', { ascending: false }).limit(10), // 7
            supabase.from('tickets').select('*, contacts(nom)').in('user_id', visibleUserIds).order('created_at', { ascending: false }).limit(10) // 8
        ]);

        // 3. Processar resultats i errors
        const errors: DashboardDataError = {};
        // ✅ CORRECCIÓ: Inicialitzem amb tipus més flexibles (permetent el tipus de dada o null)
        const dataResults: {
            statsData: Awaited<ReturnType<typeof fetchStats>> | null;
            tasksData: EnrichedTask[] | null;
            overdueInvoicesData: Awaited<ReturnType<typeof fetchOverdueInvoices>> | null;
            contactsData: Tables<'contacts'>[] | null; // Tipus correcte
            notificationsRes: Tables<'notifications'>[] | null;
            departmentsRes: Tables<'departments'>[] | null;
            teamMembersRes: Tables<'team_members_with_profiles'>[] | null;
            recentQuotesRes: EnrichedQuote[] | null;
            recentEmailsRes: EnrichedEmail[] | null;
        } = {
            statsData: null, tasksData: null, overdueInvoicesData: null, contactsData: null,
            notificationsRes: null, departmentsRes: null, teamMembersRes: null,
            recentQuotesRes: null, recentEmailsRes: null
        };

        // Funció helper per comprovar resultats de allSettled
        const processSettledResult = <T>(
            result: PromiseSettledResult<unknown>, // Accepta 'unknown' per simplificar el tipatge d'entrada
            name: keyof DashboardDataError | keyof typeof dataResults,
            isSupabaseQuery: boolean = true
        ): T | null => {
            if (result.status === 'rejected') {
                console.error(`🚨 Error en la consulta "${String(name)}":`, result.reason);
                errors[name as keyof DashboardDataError] = result.reason ?? new Error('Unknown error');
                return null;
            }
            // Comprovem error intern de Supabase si s'espera
            // Verifiquem que result.value existeix i té la propietat 'error'
            if (isSupabaseQuery && result.value && typeof result.value === 'object' && 'error' in result.value && result.value.error) {
                console.error(`🚨 Error en la consulta "${String(name)}" (Supabase):`, result.value.error);
                errors[name as keyof DashboardDataError] = (result.value.error && typeof result.value.error === 'object' && 'message' in result.value.error)
                    ? result.value.error as PostgrestError
                    : null;
                return null;
            }
            // ✅ CORRECCIÓ: Retornem 'data' si existeix i és una consulta Supabase, altrament el valor complet
             if (isSupabaseQuery && result.value && typeof result.value === 'object' && 'data' in result.value) {
                return result.value.data as T | null; // Casting segur aquí
            } else {
                return result.value as T | null; // Casting segur per a funcions no-supabase
            }
        };


        // Assignem resultats usant la funció helper
        dataResults.statsData = processSettledResult<Awaited<ReturnType<typeof fetchStats>>>(results[0], 'statsError', false);
        dataResults.tasksData = processSettledResult<EnrichedTask[]>(results[1], 'tasksError', false);
        dataResults.overdueInvoicesData = processSettledResult<Awaited<ReturnType<typeof fetchOverdueInvoices>>>(results[2], 'overdueInvoicesError', false);
        dataResults.contactsData = processSettledResult<Tables<'contacts'>[]>(results[3], 'contactsError', false);
        dataResults.notificationsRes = processSettledResult<Tables<'notifications'>[]>(results[4], 'notificationsError');
        dataResults.departmentsRes = processSettledResult<Tables<'departments'>[]>(results[5], 'departmentsError');
        dataResults.teamMembersRes = processSettledResult<Tables<'team_members_with_profiles'>[]>(results[6], 'teamMembersError');
        dataResults.recentQuotesRes = processSettledResult<EnrichedQuote[]>(results[7], 'recentQuotesError');
        dataResults.recentEmailsRes = processSettledResult<EnrichedEmail[]>(results[8], 'recentEmailsError');


        // Si alguna consulta essencial falla, retornem error
        if (errors.statsError || errors.tasksError || errors.contactsError) {
             console.error("Error(s) fetching essential dashboard data:", errors);
             return { data: null, error: { message: "Error carregant dades essencials del dashboard.", details: errors } };
        }

        // Valors per defecte robustos
        const statsData = dataResults.statsData || { total_contacts: 0, active_clients: 0, opportunities: 0, invoiced_current_month: 0, pending_total: 0, expenses_current_month: 0, invoiced_previous_month: 0, expenses_previous_month: 0 };
        const tasksData = dataResults.tasksData || [];
        const overdueInvoicesData = dataResults.overdueInvoicesData || [];
        const contactsData = dataResults.contactsData || [];


        // 4. Processament addicional
        const recentActivities = getRecentActivities(overdueInvoicesData, tasksData, contactsData);
        // ✅ CORRECCIÓ: Assegurem que 'c' té el tipus correcte (Tables<'contacts'>)
        const attentionContacts = contactsData.filter(c => c.last_interaction_at && new Date(c.last_interaction_at).toISOString() < sevenDaysAgo).slice(0, 5);

        // 5. Construir l'objecte final
        const data: DashboardInitialData = {
            stats: {
                totalContacts: statsData.total_contacts,
                activeClients: statsData.active_clients,
                opportunities: statsData.opportunities,
                invoiced: statsData.invoiced_current_month,
                pending: statsData.pending_total,
                expenses: statsData.expenses_current_month,
                invoicedChange: calculatePercentageChange(statsData.invoiced_current_month, statsData.invoiced_previous_month),
                expensesChange: calculatePercentageChange(statsData.expenses_current_month, statsData.expenses_previous_month),
                invoicedIsPositive: statsData.invoiced_current_month >= statsData.invoiced_previous_month,
                expensesIsPositive: statsData.expenses_current_month <= statsData.expenses_previous_month,
            },
            tasks: tasksData,
            departments: dataResults.departmentsRes ?? [],
            contacts: contactsData,
            overdueInvoices: overdueInvoicesData,
            attentionContacts: attentionContacts,
            notifications: dataResults.notificationsRes ?? [],
            recentActivities: recentActivities,
            recentQuotes: dataResults.recentQuotesRes ?? [],
            recentEmails: dataResults.recentEmailsRes ?? [],
            teamMembers: dataResults.teamMembersRes ?? [],
        };

        return { data, error: null };

    } catch (err: unknown) {
        const error = err as Error;
        console.error("Error catastròfic a getDashboardInitialData (service):", error.message, error.stack);
        return { data: null, error: { message: `Error inesperat obtenint dades del dashboard: ${error.message}`, details: error } };
    }
}

// ---
// ⚙️ NOVES FUNCIONS DE MUTACIÓ (Mogudes des de 'actions.ts')
// ---

/**
 * SERVEI: Afegeix una nova tasca.
 * Llança un error si falla.
 */
export async function addTask(
    supabase: SupabaseClient<Database>,
    taskData: NewTaskPayload,
    userId: string,
    teamId: string
): Promise<void> {
    const dataToInsert: DbTableInsert<'tasks'> = {
        ...taskData,
        user_id: userId,
        team_id: teamId,
        is_active: false
    };

    const { error } = await supabase.from('tasks').insert(dataToInsert);

    if (error) {
        console.error('Error creating task (service):', error);
        throw new Error(error.message);
    }
}

/**
 * SERVEI: Elimina una tasca.
 * Llança un error si falla.
 */
export async function deleteTask(
    supabase: SupabaseClient<Database>,
    taskId: number
): Promise<void> {
    // La RLS hauria de gestionar la seguretat de l'equip
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('Error en eliminar la tasca (service):', error);
        throw new Error(error.message);
    }
}

/**
 * SERVEI: Afegeix un nou departament.
 * Llança un error si falla (incloent duplicats).
 */
export async function addDepartment(
    supabase: SupabaseClient<Database>,
    name: string,
    teamId: string
): Promise<Department> {
    const { data, error } = await supabase
        .from('departments')
        .insert({ name, team_id: teamId })
        .select()
        .single();

    if (error) {
        console.error('Error en crear el departament (service):', error);
        if (error.code === '23505') { // Error de clau duplicada
            throw new Error(`El departament "${name}" ja existeix.`);
        }
        throw new Error(error.message);
    }
    return data as Department;
}

/**
 * SERVEI: Actualitza una tasca.
 * Llança un error si falla.
 */
export async function updateTask(
    supabase: SupabaseClient<Database>,
    taskId: number,
    updatedData: Partial<Tables<'tasks'>>
): Promise<void> {
    const { error } = await supabase
        .from('tasks')
        .update(updatedData)
        .eq('id', taskId);

    if (error) {
        console.error('Error en actualitzar la tasca (service):', error);
        throw new Error(error.message);
    }
}