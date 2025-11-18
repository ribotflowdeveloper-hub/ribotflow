// src/app/[locale]/(app)/crm/pipeline/actions.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actions from './actions';
import * as opportunityService from '@/lib/services/crm/pipeline/opportunities.service';
import * as session from '@/lib/supabase/session';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { Opportunity } from '@/types/db';

// Mocks
vi.mock('@/lib/services/crm/pipeline/opportunities.service');
vi.mock('@/lib/supabase/session');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const NOW = new Date().toISOString();

// ----------------------------------------------------------------------
// ESTRATÈGIA D'INFERÈNCIA DE TIPUS (Session)
// ----------------------------------------------------------------------
// Utilitzem el tipus real de retorn per evitar errors de compatibilitat manual
type SessionResult = Awaited<ReturnType<typeof session.validateUserSession>>;

// ----------------------------------------------------------------------
// ✅ FIXTURE (Opportunity) - Adaptada a l'Esquema Real
// ----------------------------------------------------------------------
const mockOpportunityFixture: Opportunity = {
    // Camps obligatoris segons el teu schema JSON:
    id: 1,
    created_at: NOW,
    name: 'Test Opportunity',
    value: 5000,
    source: 'Web',
    team_id: 'team-1',
    user_id: 'user-1',
    
    // Camps que poden ser nuls segons el tipus de Supabase (Row):
    contact_id: null,
    pipeline_stage_id: 1,
    stage_name: 'Nou Lead', // Camp text a la DB
    description: null,
    close_date: null,       // data_type: date
    probability: null,      // data_type: integer
    last_updated_at: null,  // data_type: timestamp with time zone
    
    // ⚠️ ELIMINATS: Camps que NO estan a la teva taula
    // status, priority, win_probability, closed_at, loss_reason, last_contacted_at
};

describe('Pipeline Actions (Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveOpportunityAction', () => {
        it('should call service.saveOpportunity when session is valid', async () => {
            // 1. Mock Sessió (Èxit)
            // Fem un cast a unknown intermedi per satisfer la unió SessionResult sense definir tot l'User
            const successSession = {
                activeTeamId: 'team-1',
                user: { id: 'user-1' },
                supabase: {} as unknown as SupabaseClient<Database>,
            } as unknown as SessionResult;
            
            vi.spyOn(session, 'validateUserSession').mockResolvedValue(successSession);

            // 2. Mock Servei
            vi.spyOn(opportunityService, 'saveOpportunity').mockResolvedValue(mockOpportunityFixture);

            // 3. Executar
            const formData = new FormData();
            formData.append('name', 'Test Opp');
            
            const result = await actions.saveOpportunityAction(formData);

            // 4. Validar
            expect(result.success).toBe(true);
            expect(opportunityService.saveOpportunity).toHaveBeenCalled();
        });

        it('should return error if session invalid', async () => {
            // 1. Mock Sessió (Error)
            const errorSession = {
                error: { message: 'Unauthorized' }
            } as unknown as SessionResult;
            
            vi.spyOn(session, 'validateUserSession').mockResolvedValue(errorSession);

            const formData = new FormData();
            const result = await actions.saveOpportunityAction(formData);

            expect(result.error).toBeDefined();
            expect(result.error?.message).toBe('Unauthorized');
            expect(opportunityService.saveOpportunity).not.toHaveBeenCalled();
        });
    });

    describe('updateOpportunityStageAction', () => {
        it('should update stage successfully', async () => {
            const successSession = {
                activeTeamId: 'team-1',
                user: { id: 'user-1' },
                supabase: {} as unknown as SupabaseClient<Database>,
            } as unknown as SessionResult;
            
            vi.spyOn(session, 'validateUserSession').mockResolvedValue(successSession);
            
            vi.spyOn(opportunityService, 'updateOpportunityStage').mockResolvedValue(undefined);

            const result = await actions.updateOpportunityStageAction(100, 2);

            expect(result.success).toBe(true);
            expect(opportunityService.updateOpportunityStage).toHaveBeenCalledWith(
                expect.anything(),
                100,
                2,
                'team-1'
            );
        });
    });

    describe('deleteOpportunityAction', () => {
        it('should delete opportunity successfully', async () => {
            const successSession = {
                activeTeamId: 'team-1',
                user: { id: 'user-1' },
                supabase: {} as unknown as SupabaseClient<Database>,
            } as unknown as SessionResult;

            vi.spyOn(session, 'validateUserSession').mockResolvedValue(successSession);
            
            vi.spyOn(opportunityService, 'deleteOpportunity').mockResolvedValue(undefined);

            const result = await actions.deleteOpportunityAction(100);

            expect(result.success).toBe(true);
            expect(opportunityService.deleteOpportunity).toHaveBeenCalledWith(
                expect.anything(),
                100,
                'team-1'
            );
        });
    });
});