// src/app/[locale]/(app)/finances/expenses/_components/ExpensesData.tsx
import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
// ✅ Importem la NOVA acció de categories
import { fetchPaginatedExpenses, fetchExpenseCategoriesAction } from '../actions'; 
import { getTranslations } from 'next-intl/server';

import { validateSessionAndPermission } from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
import { type PlanLimit } from '@/config/subscriptions';

import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';

const INITIAL_PAGE_LIMIT = 10; 

// ✅ Afegim searchParams
export async function ExpensesData({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) {
        redirect('/login'); 
    }

    const t = await getTranslations('ExpensesPage');
    
    // ✅ Lògica per llegir els paràmetres de la URL
    const page = parseInt(searchParams?.page as string ?? '1', 10);
    const limit = parseInt(searchParams?.limit as string ?? `${INITIAL_PAGE_LIMIT}`, 10);
    const offset = (page - 1) * limit;
    const searchTerm = (searchParams?.search as string) ?? '';
    const categoryFilter = (searchParams?.category as string) ?? 'all';
    const statusFilter = (searchParams?.status as string) ?? 'all';

    try {
        const [initialDataResult, categoriesResult, limitStatusResult] = await Promise.allSettled([
            fetchPaginatedExpenses({
                searchTerm: searchTerm,
                filters: {
                    category: categoryFilter, 
                    status: statusFilter,
                } as ExpensePageFilters,
                sortBy: 'expense_date',
                sortOrder: 'desc',
                limit: limit,
                offset: offset,
            }),
            // ✅ CANVIAT: Cridem la nova acció del catàleg
            fetchExpenseCategoriesAction(), 
            getUsageLimitStatus('maxExpensesPerMonth' as PlanLimit)
        ]);

        if (initialDataResult.status === 'rejected') {
            console.error("Error fetching initial expenses data:", initialDataResult.reason);
            throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de despeses.");
        }
        if (categoriesResult.status === 'rejected') {
            console.error("Error fetching expense categories:", categoriesResult.reason);
        }
        if (limitStatusResult.status === 'rejected') {
            console.error("Error fetching expense limit status:", limitStatusResult.reason);
        }

        const initialData = initialDataResult.value;
        
        // ✅ CORRECCIÓ (Error ts(2322)):
        // Assegurem que 'categories' MAI sigui 'undefined'.
        const categories = (categoriesResult.status === 'fulfilled' && categoriesResult.value.success) 
            ? categoriesResult.value.data 
            : []; // 👈 Si falla, passem un array buit
            
        const expenseLimitStatus = limitStatusResult.status === 'fulfilled' ? limitStatusResult.value : null;

        return (
            <ExpensesClient
                initialData={initialData}
                filterOptions={{ categories: categories ?? [] }} // 👈 Ara sempre és ExpenseCategory[]
                expenseLimitStatus={expenseLimitStatus}
            />
        );

    } catch (error) {
        console.error("Unhandled error during ExpensesData loading:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades de la pàgina de despeses.");
    }
}