import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as opportunityService from './opportunities.service';
import type { SupabaseClient, PostgrestResponse, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const TEAM_ID = 'team-123';
const USER_ID = 'user-123';

// --------------------------------------------------------------------
// HELPER PER MOCKS (Tipat estricte)
// --------------------------------------------------------------------
const mockQueryFunction = (
    data: unknown[] | unknown | null, 
    error: PostgrestError | null = null, 
    count: number = Array.isArray(data) ? data.length : 0
): PostgrestResponse<unknown> => ({
    data, 
    error, 
    count, 
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
    body: data 
} as PostgrestResponse<unknown>);

const createChainableMock = () => vi.fn().mockReturnThis();

// Definim el QueryBuilder mockejat
const queryBuilder = {
    select: createChainableMock(),
    eq: createChainableMock(),
    in: createChainableMock(),
    insert: createChainableMock(),
    update: createChainableMock(),
    delete: createChainableMock(),
    order: createChainableMock(),
    limit: createChainableMock(),
    single: vi.fn(), // single no retorna this, retorna la promesa final
    // Mockejem 'then' per a les crides que s'esperen directament (sense .single())
    then: vi.fn((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(mockQueryFunction([]))),
} as unknown;

// Tipat per accedir als mètodes als 'expect' sense errors de TS
const typedQueryBuilder = queryBuilder as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    then: ReturnType<typeof vi.fn>;
};

const supabaseMock = {
    from: vi.fn(() => queryBuilder),
} as unknown as SupabaseClient<Database>;

describe('Opportunities Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getOpportunitiesInStages', () => {
        it('should fetch opportunities filtered by stage IDs', async () => {
            const stageIds = [1, 2, 3];
            
            // Assegurem que la promesa es resol amb dades buides
            typedQueryBuilder.then.mockImplementation((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(mockQueryFunction([])));

            await opportunityService.getOpportunitiesInStages(supabaseMock, TEAM_ID, stageIds);

            expect(supabaseMock.from).toHaveBeenCalledWith('opportunities');
            expect(typedQueryBuilder.select).toHaveBeenCalledWith('*, contacts(id, nom)');
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('team_id', TEAM_ID);
            expect(typedQueryBuilder.in).toHaveBeenCalledWith('pipeline_stage_id', stageIds);
        });

        it('should return empty array immediately if no stages provided', async () => {
            // Aquest és el test clau per a l'optimització que vam afegir
            const result = await opportunityService.getOpportunitiesInStages(supabaseMock, TEAM_ID, []);
            
            expect(supabaseMock.from).not.toHaveBeenCalled();
            expect(result.data).toEqual([]);
        });
    });

    describe('saveOpportunity', () => {
        it('should INSERT a new opportunity if ID is missing', async () => {
            const formData = new FormData();
            formData.append('name', 'Nova Oportunitat');
            formData.append('pipeline_stage_id', '1');
            formData.append('value', '1000');

            // Mock del retorn de l'insert (single)
            const newOpp = { id: 1, name: 'Nova Oportunitat' };
            typedQueryBuilder.single.mockResolvedValue(mockQueryFunction(newOpp));

            await opportunityService.saveOpportunity(supabaseMock, formData, USER_ID, TEAM_ID);

            expect(typedQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Nova Oportunitat',
                pipeline_stage_id: 1,
                value: 1000,
                user_id: USER_ID,
                team_id: TEAM_ID
            }));
            // Update no s'hauria de cridar si no hi ha ID
            expect(typedQueryBuilder.update).not.toHaveBeenCalled();
        });

        it('should UPDATE an existing opportunity if ID is present', async () => {
            const formData = new FormData();
            formData.append('id', '99');
            formData.append('name', 'Oportunitat Editada');
            formData.append('pipeline_stage_id', '2');

            // Mock del retorn de l'update
            typedQueryBuilder.single.mockResolvedValue(mockQueryFunction({ id: 99 }));

            await opportunityService.saveOpportunity(supabaseMock, formData, USER_ID, TEAM_ID);

            expect(typedQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Oportunitat Editada',
                pipeline_stage_id: 2
            }));
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('id', 99);
            expect(typedQueryBuilder.insert).not.toHaveBeenCalled();
        });

        it('should throw error if pipeline_stage_id is missing', async () => {
            const formData = new FormData();
            formData.append('name', 'Fail');
            // No posem stage_id, hauria de petar

            await expect(
                opportunityService.saveOpportunity(supabaseMock, formData, USER_ID, TEAM_ID)
            ).rejects.toThrow("L'etapa és obligatòria");
        });
    });

    describe('updateOpportunityStage', () => {
        it('should update only the stage_id', async () => {
            // Mock update success (sense single, retorna promesa directa)
            typedQueryBuilder.then.mockImplementation((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(mockQueryFunction([], null)));

            await opportunityService.updateOpportunityStage(supabaseMock, 10, 5, TEAM_ID);

            expect(typedQueryBuilder.update).toHaveBeenCalledWith({ pipeline_stage_id: 5 });
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('id', 10);
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('team_id', TEAM_ID);
        });
    });

    describe('deleteOpportunity', () => {
        it('should delete by ID and TeamID', async () => {
            typedQueryBuilder.then.mockImplementation((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(mockQueryFunction([], null)));

            await opportunityService.deleteOpportunity(supabaseMock, 10, TEAM_ID);

            expect(typedQueryBuilder.delete).toHaveBeenCalled();
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('id', 10);
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('team_id', TEAM_ID);
        });
    });
});