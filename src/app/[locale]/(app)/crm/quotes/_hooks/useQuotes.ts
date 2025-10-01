"use client";

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { QuoteWithContact } from '../page';
import { deleteQuoteAction } from '../actions';

type UseQuotesProps = {
    t: (key: string) => string; // Per a les traduccions
};

export function useQuotes({ t }: UseQuotesProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isPending, startTransition] = useTransition();
    const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithContact | null>(null);

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

    const handleDelete = () => {
        if (!quoteToDelete) return;
        startTransition(async () => {
            const result = await deleteQuoteAction(quoteToDelete.id);
             // ✅ CORRECCIÓ: Utilitzem la funció 't' per a les notificacions
             if (result.success) {
                toast.success(t('toast.successTitle'), { description: result.message });
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
      
            setQuoteToDelete(null);
        });
    };

    return {
        isPending,
        quoteToDelete,
        setQuoteToDelete,
        handleSort,
        handleDelete,
        searchParams, // Passem els searchParams per a poder llegir-los a la UI
    };
}