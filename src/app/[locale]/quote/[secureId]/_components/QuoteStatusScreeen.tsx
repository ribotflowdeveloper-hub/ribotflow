"use client";

import { CheckCircle, XCircle } from "lucide-react";
import type { QuoteDataFromServer } from "@/types/finances/quotes"; // ✅ Importem el tipus correcte    

interface QuoteStatusScreenProps {
    status: 'accepted' | 'declined';
    quote: QuoteDataFromServer;
}

export function QuoteStatusScreen({ status, quote }: QuoteStatusScreenProps) {
    if (status === 'accepted') {
        return (
            <div className="flex flex-col h-screen w-full justify-center items-center bg-gray-100 text-center p-4">
                <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
                <h1 className="text-3xl text-black font-bold mb-2">Pressupost Acceptat!</h1>
                <p className="text-lg text-black">Gràcies per la teva confiança, {quote.contacts?.nom}.</p>
                <p className="text-lg text-black">Hem notificat a {quote.team?.name || 'l\'empresa'} i es posaran en contacte amb tu aviat.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full justify-center items-center bg-gray-100 text-center p-4">
            <XCircle className="w-24 h-24 text-red-500 mb-4" />
            <h1 className="text-3xl text-black font-bold mb-2">Feedback rebut</h1>
            <p className="text-lg text-black">Gràcies pels teus comentaris.</p>
        </div>
    );
}
