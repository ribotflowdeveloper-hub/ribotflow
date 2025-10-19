// src/app/[locale]/(app)/finances/despeses/[expenseId]/_components/ExpenseDetailData.tsx
import { notFound } from 'next/navigation';
import { fetchExpenseDetail } from '../actions'; 
// ❌ Línia antiga
// import { fetchContacts } from '@/app/[locale]/(app)/crm/contactes/actions'; 
// ✅ Línia nova i correcta
import { fetchSuppliers } from '@/app/[locale]/(app)/finances/suppliers/actions'; 
import { ExpenseDetailClient } from './ExpenseDetailClient';

interface ExpenseDetailDataProps {
    expenseId: number | null; 
}

export async function ExpenseDetailData({ expenseId }: ExpenseDetailDataProps) {
    const [
        expenseData, 
        allSuppliers
    ] = await Promise.all([
        expenseId ? fetchExpenseDetail(expenseId) : Promise.resolve(null),
        // ✅ Crida a la nova funció
        fetchSuppliers() 
    ]);

    if (expenseId && !expenseData) {
        notFound();
    }
    
    return (
        <ExpenseDetailClient 
            initialData={expenseData}
            isNew={expenseId === null}
            allSuppliers={allSuppliers || []}
        />
    );
}