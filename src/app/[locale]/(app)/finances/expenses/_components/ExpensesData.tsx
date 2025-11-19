import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
import { fetchPaginatedExpensesAction, fetchExpenseCategoriesAction } from '../actions'; 
import { getTranslations } from 'next-intl/server';
import { validateSessionAndPermission } from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
import { type PlanLimit } from '@/config/subscriptions';
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';
import type { EnrichedExpense } from '@/types/finances/expenses';
import type { PaginatedResponse } from '@/hooks/usePaginateResource';

const INITIAL_PAGE_LIMIT = 10; 

export async function ExpensesData({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) {
        redirect('/login'); 
    }

    const t = await getTranslations('ExpensesPage');
    
    const page = parseInt(searchParams?.page as string ?? '1', 10);
    const limit = parseInt(searchParams?.limit as string ?? `${INITIAL_PAGE_LIMIT}`, 10);
    const searchTerm = (searchParams?.search as string) ?? '';
    const categoryFilter = (searchParams?.category as string) ?? 'all';
    const statusFilter = (searchParams?.status as string) ?? 'all';

    try {
        const [initialDataResult, categoriesResult, limitStatusResult] = await Promise.allSettled([
            // Ara aquesta crida coincideix amb la interfície FetchExpensesActionParams
            fetchPaginatedExpensesAction({
                page,
                offset: (page - 1) * limit,
                limit,
                searchTerm,
                filters: {
                    category: categoryFilter, 
                    status: statusFilter,
                } as ExpensePageFilters,
                sortBy: 'expense_date',
                sortOrder: 'desc',
            }),
            fetchExpenseCategoriesAction(), 
            getUsageLimitStatus('maxExpensesPerMonth' as PlanLimit)
        ]);

        // Gestió de resultats (ja estava bé)
        let initialData: PaginatedResponse<EnrichedExpense> = { data: [], count: 0 };
        
        if (initialDataResult.status === 'fulfilled') {
            initialData = initialDataResult.value;
        } else {
            console.error("Error fetching initial expenses:", initialDataResult.reason);
        }
        
        const categories = (categoriesResult.status === 'fulfilled' && categoriesResult.value.success) 
            ? categoriesResult.value.data 
            : []; 
            
        const expenseLimitStatus = limitStatusResult.status === 'fulfilled' ? limitStatusResult.value : null;

        return (
            <ExpensesClient
                initialData={initialData}
                filterOptions={{ categories: categories ?? [] }} 
                expenseLimitStatus={expenseLimitStatus}
            />
        );

    } catch (error) {
        console.error("Unhandled error during ExpensesData loading:", error);
        throw new Error(t('errors.loadDataFailed') || "Error de càrrega.");
    }
}