"use client";

import { useCallback, useEffect, useReducer, useState } from "react"; // ✅ Afegim useState
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  type EditableQuote,
  type EditorState,
  type Opportunity,
  type QuoteItem,
  type Team,
} from "@/types/finances/quotes";
import { type TaxRate } from "@/types/finances/index";
import { editorReducer } from "./reducer";
import { useQuoteCalculations } from "./useQuoteCalculations";
import { useQuoteActions } from "./useQuoteActions";
import { fetchTaxRatesAction } from "@/components/features/taxs/fetchTaxRatesAction";

interface UseQuoteEditorProps {
  initialQuote: EditableQuote;
  initialOpportunities: Opportunity[];
  companyProfile: Team | null;
}

export function useQuoteEditor({
  initialQuote,
  initialOpportunities,
  companyProfile,
}: UseQuoteEditorProps) {
  const t = useTranslations("QuoteEditor");
  const supabase = createClient();
  // ✅ NOU ESTAT PER A LES TAXES
  const [availableTaxes, setAvailableTaxes] = useState<TaxRate[]>([]);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);
  // 1. PREPARAR ESTAT INICIAL
  const initialTaxPercent = (initialQuote.tax_rate ?? 0.21) * 100;

  let initialDiscountPercent = 0;
  if (
    initialQuote.subtotal && initialQuote.subtotal > 0 &&
    initialQuote.discount_amount
  ) {
    initialDiscountPercent = parseFloat(
      ((initialQuote.discount_amount / initialQuote.subtotal) * 100).toFixed(2),
    );
  }

  const initialState: EditorState = {
    quote: {
      ...initialQuote,
      items: initialQuote.id === "new" ? [] : (initialQuote.items || []),
      tax_percent_input: initialTaxPercent,
      discount_percent_input: initialDiscountPercent,
    },
    currentTeamData: companyProfile,
    contactOpportunities: initialOpportunities,
    isDeleteDialogOpen: false,
    isProfileDialogOpen: false,
    sendingStatus: "idle",
  };

  const [state, dispatch] = useReducer(editorReducer, initialState);

  // 3. CÀLCULS
  const totals = useQuoteCalculations(state.quote);

  // 4. ACCIONS
  const { handleSave, handleDelete, handleSend, isSaving, isSending } =
    useQuoteActions(
      state,
      dispatch,
      totals,
    );

  const onQuoteChange = useCallback(
    <K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => {
      dispatch({ type: "UPDATE_QUOTE_FIELD", payload: { field, value } });
    },
    [],
  );

  const onItemsChange = useCallback((items: Partial<QuoteItem>[]) => {
    dispatch({
      type: "UPDATE_QUOTE_FIELD",
      payload: { field: "items", value: items },
    });
  }, []);

  useEffect(() => {
    if (!state.quote.contact_id) {
      dispatch({ type: "SET_OPPORTUNITIES", payload: [] });
      return;
    }
    const loadOpps = async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("*")
        .eq("contact_id", state.quote.contact_id!);

      dispatch({ type: "SET_OPPORTUNITIES", payload: data || [] });
    };
    loadOpps();
  }, [state.quote.contact_id, supabase]);

  // ✅ EFFECT: CARREGAR TAXES (Còpia exacta d'Invoices)
  useEffect(() => {
    async function loadTaxes() {
      setIsLoadingTaxes(true);
      // Aquesta acció és la que ja funciona a Invoices
      const result = await fetchTaxRatesAction();
      if (result.success && result.data) {
        console.log("✅ Taxes carregades al client:", result.data);
        setAvailableTaxes(result.data as TaxRate[]);
      } else {
        console.error("Error carregant taxes:", result.message);
        toast.error(t("toast.loadTaxesError") || "Error carregant impostos");
      }
      setIsLoadingTaxes(false);
    }
    loadTaxes();
  }, [t]);
  // --- RETORN ---
  return {
    state,
    quote: state.quote,
    // Totals calculats
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.totalAmount,

    // ✅ AFEGIT: EXPOSEM EL DESGLOSSAMENT
    taxBreakdown: totals.taxBreakdown,

    dispatch,
    onQuoteChange,
    onItemsChange,
    setQuote: (q: EditableQuote) => dispatch({ type: "SET_QUOTE", payload: q }),
    setIsDeleteDialogOpen: (v: boolean) =>
      dispatch({ type: "SET_DELETE_DIALOG", payload: v }),
    setIsProfileDialogOpen: (v: boolean) =>
      dispatch({ type: "SET_PROFILE_DIALOG", payload: v }),
    setCurrentTeamData: (d: Team | null) =>
      dispatch({ type: "SET_TEAM_DATA", payload: d }),
    handleSave,
    handleDelete,
    handleSend,
    isSaving,
    isSending,
    t,
    availableTaxes,
    isLoadingTaxes,
  };
}
