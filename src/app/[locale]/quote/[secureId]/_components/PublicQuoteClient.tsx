"use client";

import { usePublicQuote } from "../_hooks/usePublicQuote";
import { RejectionDialog } from "./RejectionDialog";
import { QuoteStatusScreen } from "./QuoteStatusScreeen";
import { PublicQuoteView } from "./PublicQuoteView";
import type { QuoteDataFromServer } from "@/types/finances/quotes"; // ✅ Importem el tipus correcte    

export function PublicQuoteClient({ initialQuoteData }: { initialQuoteData: QuoteDataFromServer; }) {
    // Tota la lògica complexa ara prové d'aquest hook.
    const {
        quote,
        isPending,
        finalStatus,
        isRejecting,
        setIsRejecting,
        handleAccept,
        handleReject
    } = usePublicQuote(initialQuoteData);

    // Si el pressupost ja té un estat final (acceptat o rebutjat), mostrem la pantalla corresponent.
    if (finalStatus) {
        return <QuoteStatusScreen status={finalStatus} quote={quote} />;
    }
    console.log("🔍 [PublicQuoteClient] Quote Data:", quote);
    // Si no, mostrem la vista principal del pressupost i el diàleg de rebuig (que està ocult per defecte).
    return (
        <>
            <PublicQuoteView
                quoteData={quote}
                onAccept={handleAccept}
                onReject={() => setIsRejecting(true)} // Aquest botó només obre el diàleg
                isPending={isPending}
            />
            <RejectionDialog
                isOpen={isRejecting}
                onOpenChange={setIsRejecting}
                onSubmit={handleReject} // La lògica de rebuig real s'executa aquí
                isPending={isPending}
            />
        </>
    );
}
