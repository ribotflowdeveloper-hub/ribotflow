// src/app/[locale]/(app)/finances/despeses/[expenseId]/page.tsx
// Utilitzem el patró Data fetching Component -> Client Component
import { notFound } from 'next/navigation';
// import { getTranslations } from 'next-intl/server'; // ❌ Eliminat, no s'utilitza aquí
import { ExpenseDetailData } from './_components/ExpenseDetailData'; // Component que farà el fetch
// import { ExpenseDetailSkeleton } from './_components/ExpenseDetailSkeleton'; // ❌ Eliminat, utilitza loading.tsx

interface ExpenseDetailPageProps {
    params: {
        expenseId: string;
        locale: string;
    };
    searchParams: {
        [key: string]: string | string[] | undefined;}
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
    // ✅ Next.js App Router & Server Components: L'ID es llegeix directament del path
    const expenseId = params.expenseId; 

    // ✅ Bones Pràctiques: 'new' vs 'id'
    if (expenseId === 'new') {
        // Renderitzar formulari de creació
        // Passem null perquè la capa de dades sàpiga que no ha de fer cap fetch.
        return (
            <ExpenseDetailData expenseId={null} /> 
        );
    }

    // Assumint que l'ID de la DB és un nombre (bigint)
    const id = parseInt(expenseId);

    if (isNaN(id) || id <= 0) {
        // Si no és 'new' i no és un nombre vàlid, retornem 404
        notFound(); 
    }

    // El component 'ExpenseDetailData' farà el fetch i passarà la dada al client component
    return (
        <ExpenseDetailData expenseId={id} />
    );
}