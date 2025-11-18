import { useMemo } from "react";
import { type EditableQuote } from "@/types/finances/quotes";
import { calculateQuoteTotals } from "./quoteCalculations"; // Helper nou

export function useQuoteCalculations(quote: EditableQuote) {
  return useMemo(() => {
    return calculateQuoteTotals(quote);
  }, [quote]);
}