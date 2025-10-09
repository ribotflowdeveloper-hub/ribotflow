// /_hooks/useQuotes.ts (VERSIÓ CORREGIDA MANTENINT LA SEPARACIÓ)
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { QuoteWithContact } from '../page';
import { deleteQuoteAction } from '../actions';

type UseQuotesProps = {
    initialQuotes: QuoteWithContact[]; // ✅ Rep les dades inicials
    t: (key: string) => string;
};

export function useQuotes({ initialQuotes, t }: UseQuotesProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isPending, startTransition] = useTransition();

    // ✅ Gestiona l'estat localment dins del hook
    const [quotes, setQuotes] = useState(initialQuotes);
    const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithContact | null>(null);

    // ✅ Un useEffect per sincronitzar si les dades del servidor canvien
    // (important després d'un router.refresh() o navegació)

    useEffect(() => {
        setQuotes(initialQuotes);
    }, [initialQuotes]);

    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const currentOrder = params.get(`sortBy-${column}`);
        
        params.forEach((_, key) => {
            if (key.startsWith('sortBy-')) {
                params.delete(key);
            }
        });

        const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
        params.set(`sortBy-${column}`, newOrder);

        // startTransition embolcalla la navegació per a evitar bloquejar la UI
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handleDelete = useCallback(() => {
        if (!quoteToDelete) return;

        // ✅ Lògica d'actualització optimista
        setQuotes(currentQuotes => currentQuotes.filter(q => q.id !== quoteToDelete.id));
        setQuoteToDelete(null); // Tanca el diàleg a l'instant

        startTransition(async () => {
            const result = await deleteQuoteAction(quoteToDelete.id);
            if (result.success) {
                toast.success(t('toast.successTitle'), { description: result.message });
                // Forcem una resincronització amb el servidor per si de cas
                router.refresh();
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
                setQuotes(initialQuotes); // Revertim si falla
            }
        });
    }, [quoteToDelete, t, initialQuotes, router]);

    return {
        isPending,
        quotes, // ✅ Retorna l'estat local, no les props inicials
        quoteToDelete,
        setQuoteToDelete,
        handleSort,
        handleDelete,
        searchParams,
    };
}