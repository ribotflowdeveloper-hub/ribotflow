"use client";

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { acceptQuoteAction, rejectQuoteAction } from '../actions';
import type { QuoteDataFromServer } from "@/types/finances/quotes"; // ✅ Importem el tipus correcte    

/**
 * Hook que encapsula tota la lògica per a la pàgina pública d'un pressupost.
 */
export function usePublicQuote(initialQuote: QuoteDataFromServer) {
    const [quote] = useState(initialQuote);
    const [isPending, startTransition] = useTransition();

    // L'estat final del pressupost (acceptat o rebutjat)
    const [finalStatus, setFinalStatus] = useState<'accepted' | 'declined' | null>(() => {
        if (quote.status === "Accepted") return "accepted";
        if (quote.status === "Declined") return "declined";
        return null;
    });

    // Estat per a controlar la visibilitat del diàleg de rebuig
    const [isRejecting, setIsRejecting] = useState(false);

    const handleAccept = () => {
        startTransition(async () => {
            const result = await acceptQuoteAction(quote.secure_id);
            if (result.success) {
                setFinalStatus("accepted");
            } else {
                toast.error("Error en acceptar", { description: result.message });
            }
        });
    };

    const handleReject = (reason: string) => {
        startTransition(async () => {
            const result = await rejectQuoteAction(quote.secure_id, reason);
            if (result.success) {
                setFinalStatus("declined");
                setIsRejecting(false);
            } else {
                toast.error("Error en rebutjar", { description: result.message });
            }
        });
    };

    return {
        quote,
        isPending,
        finalStatus,
        isRejecting,
        setIsRejecting,
        handleAccept,
        handleReject
    };
}
