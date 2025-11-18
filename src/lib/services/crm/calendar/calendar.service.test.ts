// src/lib/services/crm/calendar/calendar.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as calendarService from './calendar.service';
import type { SupabaseClient, PostgrestResponse, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Mocks de dates i IDs
const MOCK_START = '2023-01-01T00:00:00.000Z';
const MOCK_END = '2023-01-31T23:59:59.999Z';
const TEAM_ID = 'team-123';

// ----------------------------------------------------
// ✅ FUNCIÓ HELPER TIPADA (Lliure de 'any')
// ----------------------------------------------------
const mockQueryFunction = (
    data: unknown[] | null, 
    error: PostgrestError | null = null, 
    count: number = data ? data.length : 0
): PostgrestResponse<unknown> => ({
    data, 
    error, 
    count, 
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
    body: data 
} as PostgrestResponse<unknown>);

// Mock del QueryBuilder (la versió no tipada de l'objecte)
const createChainableMock = () => vi.fn().mockReturnThis();

const queryBuilder = {
    select: createChainableMock(),
    eq: createChainableMock(),
    in: createChainableMock(),
    gte: createChainableMock(),
    lte: createChainableMock(),
    not: createChainableMock(),
    then: vi.fn((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(mockQueryFunction([]))),
    execute: vi.fn(() => mockQueryFunction([])), 
} as unknown;

// Tipat final per poder cridar les funcions de Mock sense errors.
const typedQueryBuilder = queryBuilder as {
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    then: ReturnType<typeof vi.fn>;
};


// Mock del Client Supabase
const supabaseMock = {
    from: vi.fn((table: keyof Database['public']['Tables'] | 'team_members') => {
        if (table === 'team_members') {
             const membersData = [{ user_id: 'u1' }, { user_id: 'u2' }];
             return {
                 select: vi.fn().mockReturnThis(),
                 eq: vi.fn().mockReturnThis(),
                 then: vi.fn((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(mockQueryFunction(membersData)))
             } as unknown;
        }
        return queryBuilder;
    }),
} as unknown as SupabaseClient<Database>;


describe('Calendar Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCalendarEvents', () => {
        it('should fetch ALL sources when all filters are true', async () => {
            const activeSources = { tasks: true, quotes: true, emails: true, receivedEmails: true };
            
            // ✅ CORRECCIÓ FINAL: Eliminem 'any' en la implementació del then()
            typedQueryBuilder.then.mockImplementation((resolve: (value: PostgrestResponse<unknown>) => void) => 
                 resolve(mockQueryFunction([]))); 

            await calendarService.getCalendarEvents(
                supabaseMock,
                TEAM_ID,
                MOCK_START,
                MOCK_END,
                activeSources
            );

            // Validacions
            expect(supabaseMock.from).toHaveBeenCalledWith('tasks');
            expect(supabaseMock.from).toHaveBeenCalledWith('quotes');
            expect(supabaseMock.from).toHaveBeenCalledWith('tickets');
            expect(supabaseMock.from).toHaveBeenCalledWith('team_members'); 
            
            // ✅ Ús del tipat 'typedQueryBuilder' per eliminar la variable innecessària i els errors d'accés.
            expect(typedQueryBuilder.eq).toHaveBeenCalledWith('team_id', TEAM_ID);
            expect(typedQueryBuilder.gte).toHaveBeenCalledWith(expect.stringContaining('date'), MOCK_START);
            expect(typedQueryBuilder.lte).toHaveBeenCalledWith(expect.stringContaining('date'), MOCK_END);
        });

        it('should validate date range', async () => {
            const result = await calendarService.getCalendarEvents(
                supabaseMock,
                TEAM_ID,
                'invalid-date',
                MOCK_END
            );

            expect(result.error).toBeDefined();
            expect(result.error?.validationError).toContain('invàlid');
        });
    });
});