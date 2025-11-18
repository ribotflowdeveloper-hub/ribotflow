import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
// ✅ Importem les accions des del fitxer pare 'actions.ts'
import {
  saveQuoteAction,
  deleteQuoteAction,
  sendQuoteAction,
} from "../actions";
import { generateClientSidePDF } from "../_components/PDF/clientPdfGenerator";
import { type EditorState, type EditorAction } from "@/types/finances/quotes";

// ✅ CORRECCIÓ: Actualitzem el tipus per coincidir amb useQuoteCalculations
type CalculatedTotals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxBreakdown: Record<string, number>;
  // ❌ taxRateDecimal eliminat (ja no hi ha una taxa única global)
};

export function useQuoteActions(
  state: EditorState,
  dispatch: React.Dispatch<EditorAction>,
  totals: CalculatedTotals
) {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("QuoteEditor");
  const [isSaving, startSaveTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();

  // --- SAVE ---
  const handleSave = useCallback(() => {
    // Validacions
    if (!state.quote.contact_id) {
      return toast.error(t("toast.errorTitle"), { description: t("toast.validation.missingContact") });
    }
    if (!state.quote.items || state.quote.items.length === 0) {
      return toast.error(t("toast.errorTitle"), { description: t("toast.validation.minOneItem") });
    }
    const hasInvalid = state.quote.items.some(i => !i.description?.trim() || (i.quantity ?? 0) <= 0);
    if (hasInvalid) {
      return toast.error(t("toast.errorTitle"), { description: t("toast.validation.invalidItem") });
    }

    startSaveTransition(async () => {
      // ✅ Construïm el payload amb els nous totals
      const payload = {
        ...state.quote,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        // Ja no passem tax_rate global perquè ara les taxes van per ítem
      };

      const result = await saveQuoteAction(payload);

      if (result.success && typeof result.data === "number") {
        toast.success(result.message);
        if (state.quote.id === "new") {
          router.replace(`/finances/quotes/${result.data}`);
        }
      } else {
        toast.error(t("toast.errorTitle"), { description: result.message });
      }
    });
  }, [state.quote, totals, router, t]);

  // --- DELETE ---
  const handleDelete = useCallback(() => {
    if (typeof state.quote.id !== "number") return;

    startSaveTransition(async () => {
      const result = await deleteQuoteAction(state.quote.id as number);
      if (result.success) {
        toast.success(result.message);
        router.push("/finances/quotes");
      } else {
        toast.error(t("toast.errorTitle"), { description: result.message });
      }
    });
  }, [state.quote.id, router, t]);

  // --- SEND ---
  const handleSend = useCallback(() => {
    if (typeof state.quote.id !== "number" || !state.quote.team_id) {
      return toast.error(t("toast.errorTitle"), { description: t("toast.saveFirst") });
    }

    startSendTransition(async () => {
      try {
        dispatch({ type: "SET_SENDING_STATUS", payload: "generating" });
        toast.info(t("quoteEditor.generatingPDF"));

        const fileName = `pressupost-${state.quote.quote_number || "esborrany"}.pdf`;
        const pdfBlob = await generateClientSidePDF("quote-preview-for-pdf-wrapper", fileName);

        dispatch({ type: "SET_SENDING_STATUS", payload: "uploading" });

        const filePath = `quotes/${state.quote.team_id}/${state.quote.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("fitxers-privats")
          .upload(filePath, pdfBlob, { upsert: true });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        dispatch({ type: "SET_SENDING_STATUS", payload: "sending" });

        const result = await sendQuoteAction(state.quote.id as number);
        if (!result.success) throw new Error(result.message);

        dispatch({ 
            type: "UPDATE_QUOTE_FIELD", 
            payload: { field: "status", value: "Sent" } 
        });
        dispatch({ 
            type: "UPDATE_QUOTE_FIELD", 
            payload: { field: "sent_at", value: new Date().toISOString() } 
        });

        toast.success("Enviat!", { description: result.message });

      } catch (error) {
        const msg = error instanceof Error ? error.message : t("toast.sendError");
        toast.error(t("toast.errorTitle"), { description: msg });
      } finally {
        dispatch({ type: "SET_SENDING_STATUS", payload: "idle" });
      }
    });
  }, [state.quote, supabase, t, dispatch]);

  return {
    handleSave,
    handleDelete,
    handleSend,
    isSaving,
    isSending
  };
}