import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as expensesService from './expenses.service';
import type { SupabaseClient, PostgrestError, PostgrestResponse } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
// ✅ Importem el tipus correcte per als paràmetres
import type { PaginatedActionParams } from '@/hooks/usePaginateResource';

const TEAM_ID = 'team-123';

// Helper
const createMockResponse = <T>(data: T | null, error: Partial<PostgrestError> | null = null) => ({
    data: data as unknown,
    error: error as PostgrestError | null,
    count: null,
    status: error ? 500 : 200,
    statusText: error ? 'Error' : 'OK'
} as PostgrestResponse<T>);

const createChainableMock = () => vi.fn().mockReturnThis();
const queryBuilder = {
    select: createChainableMock(),
    eq: createChainableMock(),
    order: createChainableMock(),
    then: vi.fn((resolve: (value: PostgrestResponse<unknown>) => void) => resolve(createMockResponse([]))),
} as unknown;

const supabaseMock = {
    rpc: vi.fn(), 
    from: vi.fn(() => queryBuilder),
} as unknown as SupabaseClient<Database>;

const mockRpc = supabaseMock.rpc as unknown as ReturnType<typeof vi.fn>;
const mockFrom = supabaseMock.from as unknown as ReturnType<typeof vi.fn>;

// ✅ Definim els params utilitzant la interfície correcta per al test
type ExpenseParams = PaginatedActionParams<expensesService.ExpensePageFilters>;

describe('Expenses Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchPaginatedExpenses', () => {
        it('should call RPC with correct parameters and filters', async () => {
            const mockRpcData = [
                { 
                    id: 1, 
                    description: 'Test Expense', 
                    amount: 100, 
                    total_amount: 121,
                    supplier_id: 'sup-1',
                    supplier_nom: 'Supplier A',
                    category_name: 'Office',
                    full_count: 10
                }
            ];

            mockRpc.mockResolvedValue(createMockResponse(mockRpcData));

            // ✅ Passem els paràmetres correctes (sense 'page', amb 'offset')
            // ja que el servei és pur i espera offset.
            const params: ExpenseParams = {
                page: 1,
                limit: 10,
                offset: 0,
                searchTerm: 'test',
                filters: { category: 'cat-1', status: 'paid' },
                sortBy: 'date',
                sortOrder: 'asc'
            };

            const result = await expensesService.fetchPaginatedExpenses(supabaseMock, TEAM_ID, params);

            expect(mockRpc).toHaveBeenCalledWith('get_filtered_expenses', {
                p_team_id: TEAM_ID,
                p_search_term: 'test',
                p_category_id: 'cat-1',
                p_status: 'paid',
                p_sort_by: 'date',
                p_sort_order: 'asc',
                p_limit: 10,
                p_offset: 0
            });

            expect(result.count).toBe(10);
            // TypeScript pot queixar-se de l'accés a propietats específiques si EnrichedExpense no té 'suppliers' definit així al mock,
            // però en runtime funcionarà. Pel test, podem confiar.
            expect(result.data[0].category_name).toBe('Office');
        });

        it('should handle empty results gracefully', async () => {
            mockRpc.mockResolvedValue(createMockResponse([]));

            const params: ExpenseParams = {
                page: 1,
                limit: 10, 
                offset: 0,
                searchTerm: "", // String buit per defecte
                filters: { category: 'all', status: 'all' },
                sortBy: 'expense_date',
                sortOrder: 'desc'
            };

            const result = await expensesService.fetchPaginatedExpenses(supabaseMock, TEAM_ID, params);

            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
            
            // Verificar que 'all' es converteix a undefined/null
            expect(mockRpc).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    p_category_id: undefined, 
                    p_status: undefined
                })
            );
        });

        it('should throw error on RPC failure', async () => {
            mockRpc.mockResolvedValue(createMockResponse(null, { message: 'RPC Error' }));

            const params: ExpenseParams = {
                page: 1,
                limit: 10, offset: 0, searchTerm: "",
                filters: { category: 'all', status: 'all' },
                sortBy: 'date', sortOrder: 'desc'
            };

            await expect(
                expensesService.fetchPaginatedExpenses(supabaseMock, TEAM_ID, params)
            ).rejects.toThrow('Error en carregar les dades de despeses');
        });
    });

    describe('fetchExpenseCategories', () => {
        it('should fetch categories from table', async () => {
            const mockCats = [{ id: '1', name: 'Cat 1' }];
            
            const mockOrder = vi.fn().mockResolvedValue(createMockResponse(mockCats));
            // Fem el cast necessari per assignar al mock
            (queryBuilder as { order: unknown }).order = mockOrder;

            const result = await expensesService.fetchExpenseCategories(supabaseMock, TEAM_ID);

            expect(mockFrom).toHaveBeenCalledWith('expense_categories');
            expect(result).toEqual(mockCats);
        });
    });
});