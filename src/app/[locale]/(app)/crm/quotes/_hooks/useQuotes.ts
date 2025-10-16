// /app/[locale]/(app)/crm/quotes/_hooks/useQuotes.ts
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
// ✅ Importem el tipus QuoteWithContact des del Server Component.
import type { QuoteWithContact } from '../page';
import { deleteQuoteAction } from '../actions';
// ⚠️ Nota: L'ID hauria de ser de tipus number (bigint) o string (uuid) segons la DB.
// El tipus 'id' del tipus QuoteWithContact serà la font de veritat aquí.

type UseQuotesProps = {
    initialQuotes: QuoteWithContact[];
    t: (key: string) => string;
};

export function useQuotes({ initialQuotes, t }: UseQuotesProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [quotes, setQuotes] = useState(initialQuotes);
    const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithContact | null>(null);

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

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handleDelete = useCallback(() => {
        if (!quoteToDelete) return;
        
        const originalQuotes = quotes;
        setQuotes(currentQuotes => currentQuotes.filter(q => q.id !== quoteToDelete.id));
        setQuoteToDelete(null);

        startTransition(async () => {
            // ✅ Passem el 'id' directament.
            // La tipologia correcta de 'id' (number o string) és vital per a l'acció
            // del servidor. Assumim que 'id' és de tipus 'number' pel context de bigint
            // com a ID principal en el codi de l'acció.
            const result = await deleteQuoteAction(quoteToDelete.id);
            if (result.success) {
                toast.success(t('toast.successTitle'), { description: result.message });
                router.refresh();
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
                setQuotes(originalQuotes); // Revertim en cas d'error
            }
        });
    }, [quoteToDelete, t, quotes, router]); // ✅ Afegim 'quotes' a les dependències. La dependència estava ja correcte.

    return {
        isPending,
        quotes,
        quoteToDelete,
        setQuoteToDelete,
        handleSort,
        handleDelete,
        searchParams,
    };
}