// src/lib/finances/calculations.ts

import { type TaxRate } from "@/types/finances/index";

// Interfície genèrica per a qualsevol ítem financer (InvoiceItem, QuoteItem, ExpenseItem)
export interface FinancialItem {
  quantity: number | null;
  unit_price: number | null;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  taxes?: TaxRate[] | null;
}

export interface FinancialTotals {
  subtotal: number;          // Suma bruta (qty * price)
  totalLineDiscounts: number; // Suma de descomptes de línia
  baseBeforeGlobalDiscount: number; // Subtotal - Descomptes de línia
  globalDiscountAmount: number; // Import del descompte general aplicat
  effectiveBase: number;     // Base imposable final (sobre la que s'apliquen impostos)
  taxAmount: number;         // Total IVA
  retentionAmount: number;   // Total IRPF
  totalAmount: number;       // Total a pagar
  taxBreakdown: Record<string, number>; // Desglossament per impost
}

/**
 * Calcula els valors d'una sola línia.
 * Retorna tant la base (net) com el total (brut).
 */
export function calculateLineValues(item: FinancialItem) {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const grossLineTotal = quantity * price;

  // 1. Calcular Descompte de Línia
  let lineDiscount = 0;
  if (item.discount_amount && Number(item.discount_amount) > 0) {
    lineDiscount = Number(item.discount_amount);
  } else if (item.discount_percentage && Number(item.discount_percentage) > 0) {
    lineDiscount = grossLineTotal * (Number(item.discount_percentage) / 100);
  }

  const baseAmount = grossLineTotal - lineDiscount; // Base imposable de la línia

  // 2. Calcular Impostos de la línia
  let taxAmount = 0;
  let retentionAmount = 0;

  if (item.taxes && Array.isArray(item.taxes)) {
    item.taxes.forEach((tax) => {
      const amount = baseAmount * (tax.rate / 100);
      if (tax.type === "retention") {
        retentionAmount += amount;
      } else {
        taxAmount += amount;
      }
    });
  }

  const finalLineTotal = baseAmount + taxAmount - retentionAmount;

  return {
    grossLineTotal,
    lineDiscount,
    baseAmount, // Aquest sol ser el valor que es guarda a la DB com a 'total' de l'ítem (net)
    taxAmount,
    retentionAmount,
    finalLineTotal
  };
}

/**
 * Funció MESTRA: Calcula els totals globals del document.
 * Funciona per Invoices i Quotes.
 */
export function calculateDocumentTotals(
  items: FinancialItem[],
  globalDiscountInput: number = 0, // Pot ser percentatge o quantitat, depenent de la teva lògica. Assumim IMPORT aquí si ve de invoices.
  shippingCost: number = 0,
  isGlobalDiscountPercentage: boolean = false // Flag per saber si l'input és %
): FinancialTotals {
  
  let subtotal = 0;
  let totalLineDiscounts = 0;
  let totalTaxAmount = 0; // IVA acumulat línia a línia
  let totalRetentionAmount = 0; // IRPF acumulat línia a línia
  const taxBreakdown: Record<string, number> = {};

  // 1. Processar Línies
  items.forEach((item) => {
    const lineCalc = calculateLineValues(item);
    
    subtotal += lineCalc.grossLineTotal;
    totalLineDiscounts += lineCalc.lineDiscount;

    // Acumulem impostos teòrics (abans de descompte global)
    if (item.taxes && Array.isArray(item.taxes)) {
       item.taxes.forEach(tax => {
          const amount = lineCalc.baseAmount * (tax.rate / 100);
          const key = `${tax.name} (${tax.rate}%)`;
          
          if(tax.type === 'retention') {
             totalRetentionAmount += amount;
             taxBreakdown[key] = (taxBreakdown[key] || 0) - amount;
          } else {
             totalTaxAmount += amount;
             taxBreakdown[key] = (taxBreakdown[key] || 0) + amount;
          }
       });
    }
  });

  const baseBeforeGlobalDiscount = subtotal - totalLineDiscounts;

  // 2. Calcular Descompte Global
  let globalDiscountAmount = 0;
  if (isGlobalDiscountPercentage) {
     globalDiscountAmount = baseBeforeGlobalDiscount * (globalDiscountInput / 100);
  } else {
     globalDiscountAmount = globalDiscountInput;
  }

  // 3. Calcular Factor d'Ajust (Prorrateig del descompte global als impostos)
  // Si hi ha descompte global, la base imposable baixa, i per tant els impostos baixen proporcionalment.
  const discountFactor = baseBeforeGlobalDiscount > 0 
      ? (1 - (globalDiscountAmount / baseBeforeGlobalDiscount)) 
      : 1;

  // 4. Ajustar Impostos i Retencions
  const finalTaxAmount = totalTaxAmount * discountFactor;
  const finalRetentionAmount = totalRetentionAmount * discountFactor;

  // Ajustar breakdown
  Object.keys(taxBreakdown).forEach(key => {
      taxBreakdown[key] = taxBreakdown[key] * discountFactor;
  });

  const effectiveBase = baseBeforeGlobalDiscount - globalDiscountAmount;
  const totalAmount = effectiveBase + finalTaxAmount - finalRetentionAmount + shippingCost;

  return {
    subtotal,
    totalLineDiscounts,
    baseBeforeGlobalDiscount,
    globalDiscountAmount,
    effectiveBase,
    taxAmount: finalTaxAmount,
    retentionAmount: finalRetentionAmount,
    totalAmount,
    taxBreakdown
  };
}