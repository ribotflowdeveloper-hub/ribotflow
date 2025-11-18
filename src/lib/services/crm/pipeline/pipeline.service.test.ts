import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pipelineService from './pipline.service';
import * as stagesService from './stages.service';
import * as opportunitiesService from './opportunities.service';
import * as contactsService from '../contacts/contacts.service';
import type { SupabaseClient, PostgrestError} from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Importem els tipus reals, corregint el nom del fitxer
import type { Contact, Stage } from '@/types/db';

// Mocks
vi.mock('./stages.service');
vi.mock('./opportunities.service');
vi.mock('../contacts/contacts.service');

const supabaseMock = {} as unknown as SupabaseClient<Database>;
const TEAM_ID = 'team-123';
const PIPELINE_ID = 1;

// ----------------------------------------------------------------------
// HELPER TIPEJAT (Amb càsting segur per evitar errors de PostgrestResponse)
// ----------------------------------------------------------------------
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
const createMockResponse = <T extends unknown[]>(data: T | null, error: Partial<PostgrestError> | null = null): PostgrestSingleResponse<T> => {
    if (error) {
        return {
            data: null,
            error: error as PostgrestError,
            count: null,
            status: 500,
            statusText: 'Error',
        };
    }
    return {
        data: data ?? ([] as unknown as T),
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
    };
};

describe('Pipeline Service (Orchestrator)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPipelineData', () => {
        it('should return fully populated data when all calls succeed', async () => {
            
            // 1. Mock Etapes
            // ✅ CORRECCIÓ: Ajustem el mock a les propietats reals del tipus 'Stage'
            const mockStages = [
                {
                    id: 1,
                    name: 'Stage 1',
                    position: 1,
                    color: '#fff',
                    created_at: null,
                    pipeline_id: 1,
                    stage_type: null,
                    team_id: TEAM_ID,
                    user_id: 'user-1'
                },
                {
                    id: 2,
                    name: 'Stage 2',
                    position: 2,
                    color: '#000',
                    created_at: null,
                    pipeline_id: 1,
                    stage_type: null,
                    team_id: TEAM_ID,
                    user_id: 'user-1'
                }
            ];
            
            vi.spyOn(stagesService, 'getPipelineStages').mockResolvedValue(
                createMockResponse(mockStages)
            );

            // 2. Mock Contactes
            const mockContacts = [{ 
                id: 1, 
                nom: 'Contacte 1', 
                email: 'test@test.com', 
                team_id: TEAM_ID 
            }] as unknown as Contact[];
            
            vi.spyOn(contactsService, 'getAllContacts').mockResolvedValue(mockContacts);

            // 3. Mock Oportunitats
            const mockOpps = [{ 
                close_date: null,
                contact_id: 1,
                created_at: null,
                description: 'Descripció',
                id: 100,
                last_updated_at: null,
                name: 'Deal 1',
                pipeline_stage_id: 1,
                probability: null,
                source: null,
                stage_name: null,
                team_id: TEAM_ID,
                user_id: 'user-1',
                value: null,
                contacts: { id: 1, nom: 'Contacte 1' }
            }];

            vi.spyOn(opportunitiesService, 'getOpportunitiesInStages').mockResolvedValue(
                createMockResponse(mockOpps)
            );

            // EXECUTAR
            const result = await pipelineService.getPipelineData(supabaseMock, TEAM_ID, PIPELINE_ID);

            // VALIDAR
            expect(result.error).toBeNull();
            // Com que hem fet cast, TypeScript sap que data existeix
            expect(result.data?.stages).toEqual(mockStages);
            expect(result.data?.contacts).toHaveLength(1);
            expect(result.data?.opportunities).toHaveLength(1);

            expect(stagesService.getPipelineStages).toHaveBeenCalledWith(supabaseMock, PIPELINE_ID);
            expect(opportunitiesService.getOpportunitiesInStages).toHaveBeenCalledWith(
                supabaseMock, 
                TEAM_ID, 
                [1, 2] 
            );
        });

        it('should return empty data immediately if NO stages are found', async () => {
            vi.spyOn(stagesService, 'getPipelineStages').mockResolvedValue(
                createMockResponse([] as Stage[])
            );

            const result = await pipelineService.getPipelineData(supabaseMock, TEAM_ID, PIPELINE_ID);

            expect(result.data?.stages).toEqual([]);
            expect(result.data?.opportunities).toEqual([]);
            expect(opportunitiesService.getOpportunitiesInStages).not.toHaveBeenCalled();
        });

        it('should return error if fetching stages fails', async () => {
            vi.spyOn(stagesService, 'getPipelineStages').mockResolvedValue(
                createMockResponse([] as Stage[], { message: 'DB Error' })
            );

            const result = await pipelineService.getPipelineData(supabaseMock, TEAM_ID, PIPELINE_ID);

            expect(result.data).toBeNull();
            expect(result.error?.stagesError).toBeDefined();
        });

        it('should return error if fetching opportunities fails', async () => {
            // Etapes OK
            const mockStages = [{
                id: 1,
                name: 'Stage 1',
                position: 1,
                color: '#fff',
                created_at: null,
                pipeline_id: 1,
                stage_type: null,
                team_id: TEAM_ID,
                user_id: 'user-1'
            }];
            vi.spyOn(stagesService, 'getPipelineStages').mockResolvedValue(
                createMockResponse(mockStages)
            );

            // Contactes OK
            vi.spyOn(contactsService, 'getAllContacts').mockResolvedValue([]);

            // Oportunitats FALLA
            vi.spyOn(opportunitiesService, 'getOpportunitiesInStages').mockResolvedValue(
                createMockResponse([] as pipelineService.OpportunityWithContact[], { message: 'Opp Error' })
            );

            const result = await pipelineService.getPipelineData(supabaseMock, TEAM_ID, PIPELINE_ID);

            expect(result.data).toBeNull();
            expect(result.error?.opportunitiesError).toBeDefined();
        });
    });
});