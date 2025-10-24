// src/lib/services/calendar.service.ts

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database, type Tables } from '@/types/supabase';
import { type TaskWithAssignee } from '@/types/crm'; // Assegura't que la ruta és correcta
import { type ActiveSources } from '@/types/crm/calendar'; // Importem el tipus dels filtres
import { z } from 'zod';

// Serveis d'entitat que orquestrarem
import { getTeamMembers } from './team.service';
import { getAllContacts } from './contacts.service';
import { getDepartments } from './departments.service';

// --- Tipus de Dades ---
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

// --- Tipus de Payloads ---
export type CalendarEventsPayload = {
  tasks: EnrichedTaskForCalendar[];
  quotes: EnrichedQuoteForCalendar[];
  sentEmails: EnrichedEmailForCalendar[];
  receivedEmails: EnrichedEmailForCalendar[];
};
export type TeamMember = { id: string; full_name: string | null };
export type CalendarMetadataPayload = {
  teamUsers: TeamMember[];
  contacts: Tables<'contacts'>[];
  departments: Tables<'departments'>[];
};

// --- Tipus d'Errors ---
export type CalendarEventsError = {
    tasksError?: PostgrestError | null;
    quotesError?: PostgrestError | null;
    sentEmailsError?: PostgrestError | null;
    receivedEmailsError?: PostgrestError | null;
    membersError?: PostgrestError | null;
    validationError?: string;
};
export type CalendarMetadataError = {
  usersError?: PostgrestError | null;
  contactsError?: PostgrestError | null;
  departmentsError?: PostgrestError | null;
};

// --- FUNCIÓ 1: Obtenir Events (Lògica central integrada des de 'actions') ---
export async function getCalendarEvents(
  supabase: SupabaseClient<Database>,
  teamId: string, // Rep teamId com a paràmetre
  startDate: string,
  endDate: string,
  activeSources?: ActiveSources
): Promise<{ data: CalendarEventsPayload | null; error: CalendarEventsError | null }> {

  // 1. Definim filtres per defecte
  const filters: ActiveSources = activeSources || {
    tasks: true,
    quotes: false,
    emails: false,
    receivedEmails: false,
  };

  // 2. Validació de dades d'entrada
  const dateSchema = z.string().datetime({ message: 'La data ha de ser una ISO 8601 string vàlida.' });
  if (!dateSchema.safeParse(startDate).success || !dateSchema.safeParse(endDate).success) {
    console.error("Validation error in getCalendarEvents:", { startDate, endDate });
    return { data: null, error: { validationError: 'Rang de dates invàlid.' } };
  }

  // 3. Obtenim IDs d'usuaris condicionalment
  let userIdsInTeam: string[] = [];
  if (filters.emails || filters.receivedEmails) {
    const { data: teamMembers, error } = await supabase // Utilitza el 'supabase' rebut
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId); // Utilitza el 'teamId' rebut

    if (error) {
      console.error("Error fetching team members for calendar (service):", error);
      return { data: null, error: { membersError: error } };
    }
    userIdsInTeam = teamMembers.map(member => member.user_id);
  }

  // 4. Executem consultes condicionalment
  const promises = [];

  // 1. Tasques
  if (filters.tasks) {
    promises.push(
      supabase // Utilitza el 'supabase' rebut
        .from('tasks')
        .select('*, profiles:user_asign_id (id, full_name, avatar_url), contacts(id, nom), departments(id, name)')
        .eq('team_id', teamId) // Utilitza el 'teamId' rebut
        .gte('due_date', startDate)
        .lte('due_date', endDate)
    );
  } else {
    promises.push(Promise.resolve({ data: [] as EnrichedTaskForCalendar[], error: null }));
  }

  // 2. Pressupostos
  if (filters.quotes) {
    promises.push(
      supabase // Utilitza el 'supabase' rebut
        .from('quotes')
        .select('*, contacts (id, nom)')
        .eq('team_id', teamId) // Utilitza el 'teamId' rebut
        .not('expiry_date', 'is', null)
        .gte('expiry_date', startDate)
        .lte('expiry_date', endDate)
    );
  } else {
    promises.push(Promise.resolve({ data: [] as EnrichedQuoteForCalendar[], error: null }));
  }

  // 3. Correus Enviats
  if (filters.emails && userIdsInTeam.length > 0) {
    promises.push(
      supabase // Utilitza el 'supabase' rebut
        .from('tickets')
        .select('*, contacts (id, nom)')
        .in('user_id', userIdsInTeam)
        .eq('type', 'enviat')
        .not('sent_at', 'is', null)
        .gte('sent_at', startDate)
        .lte('sent_at', endDate)
    );
  } else {
    promises.push(Promise.resolve({ data: [] as EnrichedEmailForCalendar[], error: null }));
  }

  // 4. Correus Rebuts
  if (filters.receivedEmails && userIdsInTeam.length > 0) {
    promises.push(
      supabase // Utilitza el 'supabase' rebut
        .from('tickets')
        .select('*, contacts (id, nom)')
        .in('user_id', userIdsInTeam)
        .eq('type', 'rebut')
        .not('sent_at', 'is', null)
        .gte('sent_at', startDate)
        .lte('sent_at', endDate)
    );
  } else {
    promises.push(Promise.resolve({ data: [] as EnrichedEmailForCalendar[], error: null }));
  }

  const [tasksResult, quotesResult, sentEmailsResult, receivedEmailsResult] = await Promise.all(promises);

  // 5. Gestió d'errors millorada
  const errors: CalendarEventsError = {};
  if (tasksResult.error) errors.tasksError = tasksResult.error;
  if (quotesResult.error) errors.quotesError = quotesResult.error;
  if (sentEmailsResult.error) errors.sentEmailsError = sentEmailsResult.error;
  if (receivedEmailsResult.error) errors.receivedEmailsError = receivedEmailsResult.error;

  if (Object.keys(errors).length > 0) {
    console.error("Error fetching calendar data (service):", errors);
    return { data: null, error: errors };
  }

  // 6. Retornem les dades amb 'casting' segur
  return {
    data: {
      // Afegim '?? []' per assegurar que sempre retornem un array
      tasks: (tasksResult.data as EnrichedTaskForCalendar[] ?? []),
      quotes: (quotesResult.data as EnrichedQuoteForCalendar[] ?? []),
      sentEmails: (sentEmailsResult.data as EnrichedEmailForCalendar[] ?? []),
      receivedEmails: (receivedEmailsResult.data as EnrichedEmailForCalendar[] ?? []),
    },
    error: null
  };
}


// --- FUNCIÓ 2: Obtenir Metadata (Sense canvis respecte a la versió anterior) ---
export async function getCalendarMetadata(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<{ data: CalendarMetadataPayload | null; error: CalendarMetadataError | null }> {

  const [usersResult, contactsResult, departmentsResult] = await Promise.all([
    getTeamMembers(supabase, teamId),
    getAllContacts(supabase, teamId),
    getDepartments(supabase, teamId)
  ]);

  const errors: CalendarMetadataError = {};
  if (usersResult.error) errors.usersError = usersResult.error;
  if (contactsResult.error) errors.contactsError = contactsResult.error;
  if (departmentsResult.error) errors.departmentsError = departmentsResult.error;

  if (Object.keys(errors).length > 0) {
    console.error('Error a getCalendarMetadata (service):', errors);
    return { data: null, error: errors };
  }

  // Processament d'usuaris
  const users = usersResult.data
    ?.filter(member => member.user_id)
    .map(member => ({ id: member.user_id!, full_name: member.full_name })) ?? [];

  return {
    data: {
      teamUsers: users,
      contacts: contactsResult.data ?? [],
      departments: departmentsResult.data ?? []
    },
    error: null
  };
}


// --- FUNCIÓ 3: "Cas d'Ús" per a la Càrrega Inicial (Sense canvis) ---
export async function getCalendarPageData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  startDate: string,
  endDate: string,
  activeSources?: ActiveSources
): Promise<{
  data: { events: CalendarEventsPayload, metadata: CalendarMetadataPayload } | null;
  error: { eventsError?: CalendarEventsError | null, metadataError?: CalendarMetadataError | null } | null
}> {

  const [eventsResult, metadataResult] = await Promise.all([
    getCalendarEvents(supabase, teamId, startDate, endDate, activeSources),
    getCalendarMetadata(supabase, teamId)
  ]);

  const combinedError: { eventsError?: CalendarEventsError | null, metadataError?: CalendarMetadataError | null } = {};
  if (eventsResult.error) combinedError.eventsError = eventsResult.error;
  if (metadataResult.error) combinedError.metadataError = metadataResult.error;

  if (Object.keys(combinedError).length > 0) {
    console.error("Error a getCalendarPageData (service):", combinedError);
    return { data: null, error: combinedError };
  }

  // Assegurem que data no sigui null si no hi ha error
  return {
    data: {
      events: eventsResult.data!,
      metadata: metadataResult.data!
    },
    error: null
  };
}