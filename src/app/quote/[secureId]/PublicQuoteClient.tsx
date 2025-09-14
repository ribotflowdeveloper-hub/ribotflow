"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner"; // ✅ 1. Importem 'toast' de sonner
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Send } from "lucide-react";
import { QuotePreview } from "@/app/(app)/crm/quotes/[id]/_components/QuotePreview";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Quote, Contact, CompanyProfile, QuoteItem } from "@/types/crm";

export type QuoteDataFromServer = Quote & {
  contacts: Contact;
  profiles: CompanyProfile;
  quote_items: QuoteItem[];
  secure_id: string;
};

export function PublicQuoteClient({
  initialQuoteData,
}: {
  initialQuoteData: QuoteDataFromServer;
}) {
  const [quoteData] = useState(initialQuoteData);
  const [isPending, startTransition] = useTransition();
  const [finalStatus, setFinalStatus] = useState<"accepted" | "declined" | null>(
    quoteData.status === "Accepted"
      ? "accepted"
      : quoteData.status === "Declined"
      ? "declined"
      : null
  );
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const supabase = createClient();

  const handleAccept = () => {
    startTransition(async () => {
      try {
        const { error } = await supabase.functions.invoke("accept-quote", {
          body: { secureId: quoteData.secure_id },
        });
        if (error) throw new Error(error.message);
        setFinalStatus("accepted");
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Error desconegut");
        toast.error("Error en acceptar", { description: e.message });

      }
    });
  };

  const handleRejectionSubmit = () => {
    if (rejectionReason.trim() === "") {
      toast.error("Motiu requerit", {
        description: "Si us plau, explica breument per què rebutges el pressupost.",
    });
      return;
    }
    startTransition(async () => {
      try {
        const { error } = await supabase.functions.invoke("reject-quote", {
          body: { secureId: quoteData.secure_id, reason: rejectionReason },
        });
        if (error) throw new Error(error.message);
        setFinalStatus("declined");
        setIsRejecting(false);
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Error desconegut");
        toast.error("Error en rebutjar", { description: e.message });

      }
    });
  };
 // Adaptem l'objecte per a QuotePreview, assegurant la compatibilitat
 const quoteForPreview: Quote = {
  ...quoteData,
  items: quoteData.quote_items,
};

if (finalStatus === "accepted") {
  return (
    <div className="flex flex-col h-screen w-full justify-center items-center bg-gray-100 text-center p-4">
      <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
      <h1 className="text-3xl text-black font-bold mb-2">
        Pressupost Acceptat!
      </h1>
      <p className="text-lg text-black">
        Gràcies per la teva confiança, {quoteData.contacts?.nom}.
      </p>
      <p className="text-lg text-black">
        {/* ✅ CORRECCIÓ 2: Utilitzem l'encadenament opcional (?.) per seguretat */}
        Hem notificat a {quoteData.profiles?.company_name || 'l\'empresa'} i es posaran en
        contacte amb tu aviat.
      </p>
    </div>
  );
}

  if (finalStatus === "declined") {
    return (
      <div className="flex flex-col h-screen w-full justify-center items-center bg-gray-100 text-center p-4">
        <XCircle className="w-24 h-24 text-red-500 mb-4" />
        <h1 className="text-3xl text-black font-bold mb-2">Feedback rebut</h1>
        <p className="text-lg text-black">Gràcies pels teus comentaris.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl text-black font-bold">
              Revisió del Pressupost
            </h1>
            <p className="text-gray-600">
              Hola {quoteData.contacts?.nom || "estimat client"}, revisa els
              detalls i confirma la teva decisió.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg">
            <QuotePreview
              quote={quoteForPreview}
              contacts={[quoteData.contacts]}
              companyProfile={quoteData.profiles}
              subtotal={quoteData.subtotal}
              discountAmount={
                (quoteData.subtotal || 0) * (quoteData.discount || 0) / 100
              }
              tax={quoteData.tax}
              total={quoteData.total}
            />
          </div>
          <div className="mt-8 p-6 bg-white rounded-lg shadow-lg flex flex-col sm:flex-row justify-around items-center gap-4">
            <p className="text-lg text-black font-semibold">
              Estàs d'acord amb aquest pressupost?
            </p>
            <div className="flex gap-4">
              <Button
                variant="destructive"
                size="lg"
                disabled={isPending}
                onClick={() => setIsRejecting(true)}
              >
                <XCircle className="w-5 h-5 mr-2" /> Rebutjar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={handleAccept}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Acceptar Pressupost
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={isRejecting} onOpenChange={setIsRejecting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebutjar el Pressupost</AlertDialogTitle>
            <AlertDialogDescription>
              Per ajudar-nos a millorar, si us plau, explica'ns breument els
              motius de la teva decisió.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason" className="text-left">
              Motius del rebuig
            </Label>
            <Textarea
              id="rejectionReason"
              placeholder="Ex: El preu és massa alt, falten funcionalitats..."
              className="mt-2"
              value={rejectionReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setRejectionReason(e.target.value)
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel·lar</AlertDialogCancel>
            <Button onClick={handleRejectionSubmit} disabled={isPending}>
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar i Rebutjar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
