"use client";

import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { QuotePreview } from "@/app/[locale]/(app)/finances/quotes/[id]/_components/QuotePreview";
import { type QuoteDataFromServer, type EditableQuote } from "@/types/finances/quotes"; 
import { type Database } from "@/types/supabase";
// ✅ Importem el helper de càlcul compartit
import { calculateQuoteTotals } from "@/app/[locale]/(app)/finances/quotes/[id]/_hooks/quoteCalculations"; 

type Contact = Database['public']['Tables']['contacts']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface PublicQuoteViewProps {
    quoteData: QuoteDataFromServer;
    onAccept: () => void;
    onReject: () => void;
    isPending: boolean;
}

export function PublicQuoteView({ quoteData, onAccept, onReject, isPending }: PublicQuoteViewProps) {
    
    // 1. Preparem l'objecte EditableQuote
    // Nota: quoteData.items JA hauria de contenir l'array 'taxes' gràcies al backend
    const quoteForPreview: EditableQuote = {
        ...quoteData,
        // Recalculem el % de descompte si només tenim l'import absolut
        discount_percent_input: (quoteData.subtotal && quoteData.subtotal > 0 && quoteData.discount_amount)
             ? (quoteData.discount_amount / quoteData.subtotal * 100) 
             : 0,
        tax_percent_input: null, 
        items: quoteData.items || [],
        // Assegurem valors per defecte
        subtotal: quoteData.subtotal || 0,
        discount_amount: quoteData.discount_amount || 0,
        tax_amount: quoteData.tax_amount || 0,
        total_amount: quoteData.total_amount || 0,
        // tax_rate: quoteData.tax_rate || 0.21, // Removed because 'tax_rate' does not exist
        // Camps opcionals que potser falten
        legacy_tax_amount: null,
        legacy_tax_rate: null,
        retention_amount: 0,
    } as unknown as EditableQuote;

    // ✅ 2. RECALCULEM ELS TOTALS EN TEMPS REAL
    // Això generarà el 'taxBreakdown' basant-se en els items i les seves taxes.
    const totals = calculateQuoteTotals(quoteForPreview);

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
                        contacts={quoteData.contacts ? [quoteData.contacts as unknown as Contact] : []}
                        companyProfile={quoteData.team as unknown as Team | null}
                        
                        // ✅ Passem els totals frescos del helper
                        subtotal={totals.subtotal}
                        discount_amount={totals.discountAmount}
                        tax_amount={totals.taxAmount}
                        total_amount={totals.totalAmount}
                        
                        // ✅ Passem el desglossament d'impostos
                        taxBreakdown={totals.taxBreakdown}
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