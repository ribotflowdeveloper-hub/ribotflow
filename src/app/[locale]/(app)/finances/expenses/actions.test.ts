import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actions from './actions';
import * as expensesService from '@/lib/services/finances/expenses/expenses.service';
import * as permissions from '@/lib/permissions/permissions'; 
import type { SupabaseClient, User, UserAppMetadata, UserMetadata } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { EnrichedExpense, ExpenseCategory } from '@/types/finances/expenses';

// ✅ Importem els tipus de configuració reals per als mocks
import { PLAN_IDS, type PlanId } from '@/config/subscriptions';
// ✅ Importem Role
import type { Role } from '@/lib/permissions/permissions.config';

// Mocks
vi.mock('@/lib/services/finances/expenses/expenses.service');
vi.mock('@/lib/permissions/permissions'); 
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const NOW = new Date().toISOString();

// ----------------------------------------------------------------------
// MOCKS DE SESSIÓ (TIPUS ESTRICTES)
// ----------------------------------------------------------------------

type FinalMockUser = { 
    id: string; 
    aud: string; 
    created_at: string; 
    app_metadata: UserAppMetadata;
    user_metadata: UserMetadata;   
} & Partial<User>;

// Context estricte (ha de coincidir amb UserTeamContext real)
type MockUserTeamContext = {
    role: Role | null; 
    planId: PlanId; // ✅ Ara utilitza el tipus PlanId correcte
    teamName: string | null;
};

type SessionSuccessContract = {
    supabase: SupabaseClient<Database>;
    user: FinalMockUser; 
    activeTeamId: string;
    context: MockUserTeamContext; 
};

type SessionError = { error: { message: string } };

// Unió de tipus per al retorn del mock
type SessionReturn = SessionSuccessContract | SessionError;

describe('Expenses Actions (Integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchPaginatedExpensesAction', () => {
        it('should return data when session is valid', async () => {
            // 1. Mock Sessió
            const successSessionMock: SessionSuccessContract = {
                activeTeamId: 'team-1',
                user: { 
                    id: 'u1', 
                    aud: 'auth', 
                    created_at: NOW, 
                    app_metadata: {}, 
                    user_metadata: {} 
                } as FinalMockUser,
                supabase: {} as unknown as SupabaseClient<Database>, 
                // ✅ Context vàlid amb valors literals correctes
                context: { 
                    role: 'owner', 
                    planId: PLAN_IDS.PRO, // Utilitzem la constant real (ex: 'pro')
                    teamName: 'Test Team' 
                }
            };
            
            vi.spyOn(permissions, 'validateSessionAndPermission').mockResolvedValue(
                successSessionMock as SessionReturn
            );

            // 2. Mock Servei
            const mockData = {
                data: [{ id: 1, description: 'Test' }] as unknown as EnrichedExpense[],
                count: 1
            };
            vi.spyOn(expensesService, 'fetchPaginatedExpenses').mockResolvedValue(mockData);

            // 3. Executar
            const params = {
                page: 1, limit: 10, offset: 0,
                searchTerm: '',
                filters: { category: 'all', status: 'all' },
                sortBy: 'date',
                sortOrder: 'desc' as const
            };
            const result = await actions.fetchPaginatedExpensesAction(params);

            // 4. Validar
            expect(result.data).toHaveLength(1);
            expect(result.count).toBe(1);
            expect(expensesService.fetchPaginatedExpenses).toHaveBeenCalled();
        });

        it('should return empty array on session error', async () => {
            vi.spyOn(permissions, 'validateSessionAndPermission').mockResolvedValue({
                error: { message: 'No session' }
            } as SessionReturn);

            const params = { 
                page: 1, 
                limit: 10, 
                offset: 0,
                searchTerm: '', 
                filters: { category: 'all', status: 'all' },
                sortBy: 'date',
                sortOrder: 'desc' as const
            };

            const result = await actions.fetchPaginatedExpensesAction(params);

            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
            expect(expensesService.fetchPaginatedExpenses).not.toHaveBeenCalled();
        });
    });

    describe('createExpenseCategoryAction', () => {
        it('should create category successfully', async () => {
            // Mock Sessió (Manage Perms)
            const successSessionMock: SessionSuccessContract = {
                activeTeamId: 'team-1',
                user: { id: 'u1', aud: 'auth', created_at: NOW, app_metadata: {}, user_metadata: {} } as FinalMockUser,
                supabase: {} as unknown as SupabaseClient<Database>, 
                // ✅ Context vàlid
                context: { role: 'admin', planId: PLAN_IDS.FREE, teamName: 'Test Team' }
            };
            
            vi.spyOn(permissions, 'validateSessionAndPermission').mockResolvedValue(successSessionMock as SessionReturn);

            // Mock Supabase Insert
            const mockInsertReturn = {
                data: { id: 'cat-1', name: 'New Cat' },
                error: null
            };

            // Cadena de mocks per Supabase
            const mockSingle = vi.fn().mockResolvedValue(mockInsertReturn);
            const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
            const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

            // Sobreescrivim el mètode from del supabase mockejat de forma segura
            (successSessionMock.supabase as unknown as { from: unknown }).from = mockFrom;

            const result = await actions.createExpenseCategoryAction('New Cat', null);

            expect(result.success).toBe(true);
            if (result.success) {
                 const category = result.data as ExpenseCategory;
                 expect(category.name).toBe('New Cat');
            }
            expect(mockFrom).toHaveBeenCalledWith('expense_categories');
        });
    });
});