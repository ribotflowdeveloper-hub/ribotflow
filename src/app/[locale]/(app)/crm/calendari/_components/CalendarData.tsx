// src/app/[locale]/(app)/crm/calendari/_components/CalendarData.tsx
import CalendarClient from './CalendarClient';
import { validatePageSession } from '@/lib/supabase/session';
import { TaskWithAssignee } from '@/types/crm';
import { Tables } from '@/types/supabase';
import { getCalendarData } from '../actions'; 
import { startOfWeek, endOfWeek } from 'date-fns';

// --- Tipus Enriquits per al Calendari ---
export type EnrichedTaskForCalendar = TaskWithAssignee & {
    contacts: Tables<'contacts'> | null;
    departments: Tables<'departments'> | null;
};
export type EnrichedQuoteForCalendar = Tables<'quotes'> & {
    contacts: Pick<Tables<'contacts'>, 'id' | 'nom'> | null;
};
export type EnrichedEmailForCalendar = Tables<'tickets'> & {
    contacts: Pick<Tables<'contacts'>, 'id' | 'nom'> | null;
};


export default async function CalendarData() {
    const { supabase, activeTeamId } = await validatePageSession();

    // CÀLCUL INICIAL (Vista per defecte "setmana")
    const today = new Date();
    // Utilitzem `weekStartsOn: 1` per forçar que la setmana comenci en dilluns.
    const initialStart = startOfWeek(today, { weekStartsOn: 1 as const }).toISOString();
    const initialEnd = endOfWeek(today, { weekStartsOn: 1 as const }).toISOString();
    
    // CRIDA OPTIMITZADA
    const initialData = await getCalendarData(initialStart, initialEnd); 

    const [usersResult, contactsResult, departmentsResult] = await Promise.all([
        supabase.from('team_members_with_profiles').select('user_id, full_name').eq('team_id', activeTeamId),
        supabase.from('contacts').select('*').eq('team_id', activeTeamId),
        supabase.from('departments').select('*').eq('team_id', activeTeamId),
    ]);

    if (initialData.error || usersResult.error || contactsResult.error || departmentsResult.error) {
        console.error('Error carregant dades per al calendari:',
            initialData.error || usersResult.error || contactsResult.error || departmentsResult.error
        );
        return <CalendarClient 
            initialTasks={[]} 
            initialQuotes={[]} 
            initialSentEmails={[]} 
            initialReceivedEmails={[]} 
            teamUsers={[]} 
            contacts={[]} 
            departments={[]} 
            fetchCalendarDataAction={getCalendarData} 
        />;
    }

    const users = usersResult.data
        ?.filter(member => member.user_id)
        .map(member => ({ id: member.user_id!, full_name: member.full_name })) ?? [];

    return (
        <CalendarClient
            initialTasks={initialData.tasks ?? []}
            initialQuotes={initialData.quotes ?? []}
            initialSentEmails={initialData.sentEmails ?? []}
            initialReceivedEmails={initialData.receivedEmails ?? []}
            teamUsers={users} 
            contacts={contactsResult.data ?? []}
            departments={departmentsResult.data ?? []}
            fetchCalendarDataAction={getCalendarData} 
        />
    );
}