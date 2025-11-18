import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actions from './actions';
import * as calendarService from '@/lib/services/crm/calendar/calendar.service';
import * as session from '@/lib/supabase/session';
import type { SupabaseClient} from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import type { CalendarEventsPayload, EnrichedTaskForCalendar } from '@/lib/services/crm/calendar/calendar.service';

// Mocks
vi.mock('@/lib/services/crm/calendar/calendar.service');
vi.mock('@/lib/supabase/session');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const NOW = new Date().toISOString();

// ----------------------------------------------------------------------
// ESTRATÈGIA DE TIPUS PER INFERÈNCIA (Solució Professional)
// ----------------------------------------------------------------------
// En lloc de crear tipus manuals, demanem a TS quin és el tipus de retorn real.
type SessionResult = Awaited<ReturnType<typeof session.validatePageSession>>;

// ----------------------------------------------------------------------
// FIXTURE (Task): Corregida amb els camps que l'error demanava
// ----------------------------------------------------------------------
const mockTaskFixture: EnrichedTaskForCalendar = {
    id: 1, 
    title: 'Task 1',
    priority: 'Baixa',
    is_completed: false,
    is_active: true,
    
    team_id: 'team-1',
    user_id: 'user-1', 
    description: 'Mock task description',
    contact_id: null,
    department_id: null, 
    
    created_at: NOW,
    due_date: NOW,
    asigned_date: NOW,
    
    checklist_progress: {} as Json, 
    description_json: {} as Json,   
    time_tracking_log: null, 
    
    user_asign_id: null,
    duration: null,
    
    // ✅ AFEGITS ELS CAMPS QUE FALTAVEN (segons el teu últim error)
    finish_date: null,
    google_calendar_id: null,
    
    profiles: null,
    contacts: null,
    departments: null,
};

describe('Calendar Actions (Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCalendarData', () => {
        it('should return data when session is valid', async () => {
            // 1. Preparem l'objecte d'èxit
            // Utilitzem 'unknown' intermedi per fer el cast al tipus inferit 'SessionResult'.
            // Això és segur perquè estem en un entorn de test simulat.
            const successSession = {
                activeTeamId: 'team-1',
                user: { id: 'user-1' }, 
                supabase: {} as unknown as SupabaseClient<Database>, 
            } as unknown as SessionResult;
            
            vi.spyOn(session, 'validatePageSession').mockResolvedValue(successSession);

            // 2. Mock Resposta del Servei
            const mockData: CalendarEventsPayload = {
                tasks: [mockTaskFixture],
                quotes: [],
                sentEmails: [],
                receivedEmails: []
            };
            
            vi.spyOn(calendarService, 'getCalendarEvents').mockResolvedValue({
                data: mockData,
                error: null
            });

            // 3. Executar
            const result = await actions.getCalendarData(
                '2023-01-01', 
                '2023-01-31', 
                { tasks: true, quotes: false, emails: false, receivedEmails: false }
            );

            // 4. Validar
            expect(result.error).toBeUndefined();
            expect(result.tasks).toHaveLength(1);
            expect(calendarService.getCalendarEvents).toHaveBeenCalled();
        });

        it('should return error when session is invalid', async () => {
            // 1. Preparem l'objecte d'error
            const errorSession = {
                error: { message: 'No session' }
            } as unknown as SessionResult;

            vi.spyOn(session, 'validatePageSession').mockResolvedValue(errorSession);

            // 2. Executar
            const result = await actions.getCalendarData('2023-01-01', '2023-01-31');

            // 3. Validar
            expect(result.error).toBe('Error de sessió. Torna a iniciar la sessió.');
            expect(calendarService.getCalendarEvents).not.toHaveBeenCalled();
        });
    });
});