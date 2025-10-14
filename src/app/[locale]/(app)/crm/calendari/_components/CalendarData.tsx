//test comentari
import CalendarClient from './CalendarClient';
import { validatePageSession } from '@/lib/supabase/session';
import { TaskWithAssignee } from '@/types/crm'; // He corregit la ruta a la teva
import { Tables } from '@/types/supabase';

// Aquest tipus representa la tasca amb totes les seves relacions
export type EnrichedTaskForCalendar = TaskWithAssignee & {
  contacts: Tables<'contacts'> | null;
  departments: Tables<'departments'> | null;
};

export default async function CalendarData() {
  const { supabase, activeTeamId } = await validatePageSession();

  const [tasksResult, usersResult, contactsResult, departmentsResult] = await Promise.all([
    // ✅ SOLUCIÓ: Afegim 'avatar_url' a la selecció de 'profiles'.
    supabase
      .from('tasks')
      .select('*, profiles:user_asign_id (id, full_name, avatar_url), contacts(*), departments(*)')
      .eq('team_id', activeTeamId),
    
    supabase
      .from('team_members_with_profiles')
      .select('user_id, full_name')
      .eq('team_id', activeTeamId),
    supabase
      .from('contacts')
      .select('*')
      .eq('team_id', activeTeamId),
    supabase
      .from('departments')
      .select('*')
      .eq('team_id', activeTeamId),
  ]);

  if (tasksResult.error || usersResult.error || contactsResult.error || departmentsResult.error) {
    console.error('Error carregant dades per al calendari:', 
      tasksResult.error || usersResult.error || contactsResult.error || departmentsResult.error
    );
    return <CalendarClient initialTasks={[]} teamUsers={[]} contacts={[]} departments={[]} />;
  }
  
  const tasks: EnrichedTaskForCalendar[] = tasksResult.data as unknown as EnrichedTaskForCalendar[];
  const contacts: Tables<'contacts'>[] = contactsResult.data ?? [];
  const departments: Tables<'departments'>[] = departmentsResult.data ?? [];
  
  const users = usersResult.data
    ?.filter(member => member.user_id)
    .map(member => ({
      id: member.user_id!,
      full_name: member.full_name
    })) ?? [];
  
  return <CalendarClient initialTasks={tasks} teamUsers={users} contacts={contacts} departments={departments} />;
}