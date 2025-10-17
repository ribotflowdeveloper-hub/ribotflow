// src/app/[locale]/(app)/crm/calendari/actions.ts

'use server';

import { z } from 'zod';
import { validatePageSession } from '@/lib/supabase/session';
import { EnrichedTaskForCalendar, EnrichedQuoteForCalendar, EnrichedEmailForCalendar } from './_components/CalendarData';
import { ActiveSources } from '@/types/crm/calendar';   


// ✅ Funció optimitzada i amb correcció de seguretat per 'activeSources'
export async function getCalendarData(startDate: string, endDate: string, activeSources?: ActiveSources) {
    const sessionResult = await validatePageSession();
    if ('error' in sessionResult) {
        return { tasks: null, quotes: null, sentEmails: null, receivedEmails: null, error: 'Error de sessió. Torna a iniciar la sessió.' };
    }
    const { supabase, activeTeamId } = sessionResult;

    // 🧠 FIX CLAU: Si activeSources és undefined (càrrega inicial del Server Component),
    // utilitzem el filtre per defecte (només tasques).
    const filters: ActiveSources = activeSources || {
        tasks: true,
        quotes: false,
        emails: false,
        receivedEmails: false,
    };


    // Validació de dades d'entrada (unchanged)
    const dateSchema = z.string().datetime({ message: 'La data ha de ser una ISO 8601 string vàlida.' });
    if (!dateSchema.safeParse(startDate).success || !dateSchema.safeParse(endDate).success) {
        return { tasks: null, quotes: null, sentEmails: null, receivedEmails: null, error: 'Rang de dates invàlid.' };
    }

    // Pas 1: Obtenim la llista d'IDs dels usuaris de l'equip actiu (Condicionalment).
    let userIdsInTeam: string[] = [];
    // ✅ Utilitzem 'filters' per a la verificació
    if (filters.emails || filters.receivedEmails) {
        const { data: teamMembers, error: membersError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', activeTeamId);

        if (membersError) {
            console.error("Error fetching team members for calendar:", membersError);
            return { tasks: null, quotes: null, sentEmails: null, receivedEmails: null, error: membersError.message };
        }
        userIdsInTeam = teamMembers.map(member => member.user_id);
    }
    
    // Pas 2: Executem consultes condicionalment
    const promises = [];

    // 1. Tasques
    if (filters.tasks) {
        promises.push(
            supabase
                .from('tasks')
                .select('*, profiles:user_asign_id (id, full_name, avatar_url), contacts(id, nom), departments(id, name)')
                .eq('team_id', activeTeamId)
                .gte('due_date', startDate) 
                .lte('due_date', endDate)
        );
    } else {
        promises.push(Promise.resolve({ data: [] as EnrichedTaskForCalendar[], error: null }));
    }

    // 2. Pressupostos
    if (filters.quotes) {
        promises.push(
            supabase
                .from('quotes')
                .select('*, contacts (id, nom)')
                .eq('team_id', activeTeamId)
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
            supabase
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
            supabase
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

    const error = tasksResult.error || quotesResult.error || sentEmailsResult.error || receivedEmailsResult.error;

    if (error) {
        console.error("Error fetching calendar data:", {
            tasksError: tasksResult.error,
            quotesError: quotesResult.error,
            sentEmailsError: sentEmailsResult.error,
            receivedEmailsError: receivedEmailsResult.error,  
        });
        return { tasks: null, quotes: null, sentEmails: null, receivedEmails: null, error: error ? error.message : 'Error desconegut' };
    }

    return {
        tasks: tasksResult.data as unknown as EnrichedTaskForCalendar[],
        quotes: quotesResult.data as unknown as EnrichedQuoteForCalendar[],
        sentEmails: sentEmailsResult.data as unknown as EnrichedEmailForCalendar[], 
        receivedEmails: receivedEmailsResult.data as unknown as EnrichedEmailForCalendar[], 
    };
}