"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Building, Download, Loader2, Send, Trash2 } from "lucide-react";
import { QuoteDownloadButton } from "../PDF/QuoteDownloadButton";
import { type EditableQuote, type Team, type Contact } from "@/types/finances/quotes";

interface EditorHeaderProps {
  quote: EditableQuote;
  companyProfile: Team | null;
  contact: Contact | null;
  totals: {
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    taxBreakdown?: Record<string, number>; // ✅ Assegura't que tens això
  };
  isSaving: boolean;
  isSending: boolean;
  sendingStatus: string;
  onBack: () => void;
  onSave: () => void;
  onSend: () => void;
  onDelete: () => void;
  onOpenProfile: () => void;
  locale: string;
  // ✅ CORRECCIÓ 1: Substituïm 'any' per 'unknown' o un objecte genèric
  // Això satisfà ESLint i és més segur.
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}

export function EditorHeader({
  quote,
  companyProfile,
  contact,
  totals,
  isSaving,
  isSending,
  sendingStatus,
  onBack,
  onSave,
  onSend,
  onDelete,
  onOpenProfile,
  locale,
  t,
}: EditorHeaderProps) {

  const StatusBadge = () => {
    if (!quote.sent_at) return null;
    const sentDate = new Date(quote.sent_at).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return (
      <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium whitespace-nowrap">
        {t("quoteEditor.sentOn", { date: sentDate })}
      </div>
    );
  };
  // Definim un helper per netejar l'objecte abans de passar-lo
  // Això assegura que els camps undefined es converteixen a null si cal
  const safeQuoteForPdf = {
    ...quote,
    id: quote.id as number,
    contact_id: quote.contact_id as number,
    // Assegurem que created_at no sigui undefined (si ho és, posem string buit o null)
    created_at: quote.created_at ?? new Date().toISOString(),
    // Fem el mateix per altres camps conflictius si surten més errors
    issue_date: quote.issue_date ?? new Date().toISOString().split('T')[0],
  };
  // ✅ CORRECCIÓ 2: Comprovació estricta abans de renderitzar el botó.
  // El botó de descàrrega només s'ha de mostrar si tenim un ID vàlid (no 'new')
  // i si els camps essencials no són nuls.
  const canDownloadPdf = typeof quote.id === "number" && quote.contact_id;

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onBack} className="flex-shrink-0 bg-card">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("quoteEditor.backButton")}
        </Button>
        <StatusBadge />
      </div>

      <div className="flex flex-wrap justify-start sm:justify-end items-center gap-2 w-full sm:w-auto">

        {/* Lògica del Botó PDF */}
        {canDownloadPdf ? (
          <QuoteDownloadButton
            quote={safeQuoteForPdf} // Ara passem l'objecte "netejat"
            company={companyProfile}
            contact={contact}
            totals={totals}
            t={t}
            
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="icon" disabled>
                    <Download className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("quoteEditor.pdfNotAvailableYet")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenProfile}
          title={t("quoteEditor.companyDataTooltip")}
        >
          <Building className="w-4 h-4" />
        </Button>

        {quote.id !== "new" && (
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            title={t("quoteEditor.deleteTooltip")}
            className="bg-card"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}

        <Button
          onClick={onSave}
          disabled={isSaving || isSending}
          className="min-w-[110px] w-full sm:w-auto"
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {quote.id === "new" ? t("quoteEditor.createButton") : t("quoteEditor.saveButton")}
        </Button>

        {quote.id !== "new" && (
          <Button
            onClick={onSend}
            disabled={isSaving || isSending}
            className="min-w-[120px] w-full sm:w-auto"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {sendingStatus === "generating" && t("quoteEditor.generatingPDF")}
                {sendingStatus === "uploading" && t("quoteEditor.uploadingFile")}
                {sendingStatus === "sending" && t("quoteEditor.sending")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {quote.sent_at ? t("quoteEditor.resendButton") : t("quoteEditor.sendButton")}
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}