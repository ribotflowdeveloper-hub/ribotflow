// src/app/[locale]/(app)/crm/calendari/_components/CalendarData.tsx
import CalendarClient from './CalendarClient';
import { validatePageSession } from '@/lib/supabase/session';
import { TaskWithAssignee } from '@/types/crm';
import { Tables } from '@/types/supabase';
import { getCalendarData } from '../actions';

// --- Tipus Enriquits per al Calendari ---
export type EnrichedTaskForCalendar = TaskWithAssignee & {
  contacts: Tables<'contacts'> | null;
  departments: Tables<'departments'> | null;
};

// ✅ CORRECCIÓ: Utilitzem 'nom' en lloc de 'full_name'
export type EnrichedQuoteForCalendar = Tables<'quotes'> & {
  contacts: Pick<Tables<'contacts'>, 'id' | 'nom'> | null;
};

// ✅ CORRECCIÓ: Utilitzem 'nom' en lloc de 'full_name'
export type EnrichedEmailForCalendar = Tables<'tickets'> & {
  contacts: Pick<Tables<'contacts'>, 'id' | 'nom'> | null;
};


export default async function CalendarData() {
  const { supabase, activeTeamId } = await validatePageSession();

  const initialData = await getCalendarData();

  const [usersResult, contactsResult, departmentsResult] = await Promise.all([
    supabase.from('team_members_with_profiles').select('user_id, full_name').eq('team_id', activeTeamId),
    supabase.from('contacts').select('*').eq('team_id', activeTeamId),
    supabase.from('departments').select('*').eq('team_id', activeTeamId),
  ]);

  if (initialData.error || usersResult.error || contactsResult.error || departmentsResult.error) {
    console.error('Error carregant dades per al calendari:',
      initialData.error || usersResult.error || contactsResult.error || departmentsResult.error
    );
    // ✅ CORRECCIÓ: Afegim 'teamUsers' i les altres props que faltaven al return d'error.
    return <CalendarClient 
        initialTasks={[]} 
        initialQuotes={[]} 
        initialSentEmails={[]} 
        initialReceivedEmails={[]} 
        teamUsers={[]} 
        contacts={[]} 
        departments={[]} 
    />;
  }

  const users = usersResult.data
    ?.filter(member => member.user_id)
    .map(member => ({ id: member.user_id!, full_name: member.full_name })) ?? [];

  return (
    // ✅ CORRECCIÓ: Assegurem que totes les props es passen correctament.
    <CalendarClient
      initialTasks={initialData.tasks ?? []}
      initialQuotes={initialData.quotes ?? []}
      initialSentEmails={initialData.sentEmails ?? []}
      initialReceivedEmails={initialData.receivedEmails ?? []}
      teamUsers={users} 
      contacts={contactsResult.data ?? []}
      departments={departmentsResult.data ?? []}
    />
  );
}