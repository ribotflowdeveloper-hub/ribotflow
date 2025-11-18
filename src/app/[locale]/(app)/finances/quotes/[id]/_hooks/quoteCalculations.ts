import { type QuoteItem, type EditableQuote } from "@/types/finances/quotes";

/**
 * Calcula el total d'una línia de pressupost tenint en compte impostos i retencions.
 */
export function calculateLineTotal(item: Partial<QuoteItem>): number {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const base = quantity * price;

  let taxAdjustment = 0;
  
  if (item.taxes && item.taxes.length > 0) {
    item.taxes.forEach((tax) => {
      const amount = base * (tax.rate / 100);
      if (tax.type === "retention") {
        taxAdjustment -= amount; 
      } else {
        taxAdjustment += amount; 
      }
    });
  }

  return base + taxAdjustment;
}

/**
 * ✅ NOU HELPER: Calcula tots els totals del pressupost
 * Això substitueix la lògica que tenies dins de useQuoteCalculations, 
 * permetent reutilitzar-la a la PublicQuoteView.
 */
export function calculateQuoteTotals(quote: EditableQuote) {
    const { items, discount_percent_input } = quote;

    let subtotal = 0;
    let totalTaxAmount = 0;
    let totalRetentionAmount = 0;
    
    const taxBreakdown: Record<string, number> = {};

    items.forEach((item) => {
      const quantity = item.quantity ?? 1;
      const price = item.unit_price ?? 0;
      const lineBase = quantity * price;

      subtotal += lineBase;

      if (item.taxes && item.taxes.length > 0) {
        item.taxes.forEach((tax) => {
          const taxAmount = lineBase * (tax.rate / 100);
          const taxKey = `${tax.name} (${tax.rate}%)`;

          if (tax.type === 'retention') {
            totalRetentionAmount += taxAmount;
            taxBreakdown[taxKey] = (taxBreakdown[taxKey] || 0) - taxAmount;
          } else {
            totalTaxAmount += taxAmount;
            taxBreakdown[taxKey] = (taxBreakdown[taxKey] || 0) + taxAmount;
          }
        });
      }
    });

    const discountPercent = discount_percent_input || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    
    const discountFactor = subtotal > 0 ? (1 - (discountAmount / subtotal)) : 1;
    
    const finalTaxAmount = totalTaxAmount * discountFactor;
    const finalRetentionAmount = totalRetentionAmount * discountFactor;

    Object.keys(taxBreakdown).forEach(key => {
        taxBreakdown[key] = taxBreakdown[key] * discountFactor;
    });

    const total = (subtotal - discountAmount) + finalTaxAmount - finalRetentionAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount: finalTaxAmount,
      retentionAmount: finalRetentionAmount,
      totalAmount: total,
      taxBreakdown,
    };
}