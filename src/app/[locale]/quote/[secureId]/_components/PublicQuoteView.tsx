"use client";

import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { QuotePreview } from "@/app/[locale]/(app)/finances/quotes/[id]/_components/QuotePreview";
import { type QuoteDataFromServer } from "@/types/finances/quotes"; // ✅ Importem el tipus correcte
// ✅ 1. Importem els tipus que 'QuotePreview' realment espera.
import { type EditableQuote } from "@/app/[locale]/(app)/finances/quotes/[id]/_hooks/useQuoteEditor";
import { type Database } from "@/types/supabase";

// Definim els tipus locals que 'QuotePreview' utilitza
type Contact = Database['public']['Tables']['contacts']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface PublicQuoteViewProps {
    quoteData: QuoteDataFromServer;
    onAccept: () => void;
    onReject: () => void;
    isPending: boolean;
}

export function PublicQuoteView({ quoteData, onAccept, onReject, isPending }: PublicQuoteViewProps) {
    
    // ✅ 2. Creem l'objecte 'quoteForPreview' amb el tipus correcte 'EditableQuote'.
    //    Fem una asserció de tipus perquè sabem que l'estructura de dades és compatible.
    const quoteForPreview = quoteData as unknown as EditableQuote;

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl text-black font-bold">Revisió del Pressupost</h1>
                    <p className="text-gray-600">Hola {quoteData.contacts?.nom || "estimat client"}, revisa els detalls i confirma la teva decisió.</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg">
                    <QuotePreview
                        quote={quoteForPreview}
                        // ✅ 3. Assegurem que els contactes es passen com el tipus correcte.
                        contacts={quoteData.contacts ? [quoteData.contacts as unknown as Contact] : []}
                        // ✅ 4. Assegurem que el perfil de l'empresa es passa com el tipus correcte.
                        companyProfile={quoteData.team as unknown as Team | null}
                        subtotal={quoteData.subtotal || 0}
                        discountAmount={(quoteData.subtotal || 0) * (quoteData.discount || 0) / 100}
                        tax={quoteData.tax || 0}
                        total={quoteData.total || 0}
                    />
                </div>
                <div className="mt-8 p-6 bg-white rounded-lg shadow-lg flex flex-col sm:flex-row justify-around items-center gap-4">
                    <p className="text-lg text-black font-semibold">Estàs d'acord amb aquest pressupost?</p>
                    <div className="flex gap-4">
                        <Button variant="destructive" size="lg" disabled={isPending} onClick={onReject}>
                            <XCircle className="w-5 h-5 mr-2" /> Rebutjar
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" size="lg" onClick={onAccept} disabled={isPending}>
                            {isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                            Acceptar Pressupost
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}