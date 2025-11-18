import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePdfDocument } from '@/app/[locale]/(app)/finances/quotes/[id]/_components/PDF/QuotePdfDocument'
import { type EditableQuote, type Team, type Contact } from '@/types/finances/quotes'
import { calculateQuoteTotals } from "@/app/[locale]/(app)/finances/quotes/[id]/_hooks/quoteCalculations"; 

export async function generateQuotePdfBuffer(
  quote: EditableQuote, 
  company: Team | null,
  contact: Contact | null
): Promise<Buffer> {
  
  // 1. Recuperem valors base de la BD per reconstruir el percentatge
  const dbSubtotal = quote.subtotal || 0;
  const dbDiscountAmount = quote.discount_amount || 0;

  // ✅ CÀLCUL CLAU: Reconstruïm el % de descompte si no el tenim
  // Si tenim un descompte de 10€ sobre 100€, el % és 10.
  let derivedDiscountPercent = quote.discount_percent_input;
  
  if ((!derivedDiscountPercent || derivedDiscountPercent === 0) && dbSubtotal > 0 && dbDiscountAmount > 0) {
      derivedDiscountPercent = (dbDiscountAmount / dbSubtotal) * 100;
  }

  // 2. Preparem l'objecte per al calculador amb el % injectat
  const quoteForCalc: EditableQuote = {
    ...quote,
    discount_percent_input: derivedDiscountPercent ?? 0,
    // tax_percent_input ja no s'usa, però el deixem a null
    tax_percent_input: null,
  };

  // 3. RECALCULEM TOTS ELS TOTALS (Ara el descompte serà correcte)
  const calculatedTotals = calculateQuoteTotals(quoteForCalc);

  // 🔍 Debug (pots esborrar-ho després)
  console.log("🔍 [PDF Gen] Discount Input:", derivedDiscountPercent);
  console.log("🔍 [PDF Gen] Calculated Discount:", calculatedTotals.discountAmount);

  // 4. Generar el document
  const document = (
    <QuotePdfDocument
      quote={quoteForCalc}
      company={company}
      contact={contact}
      
      // Passem els totals recalculats (que ara inclouran el descompte i els impostos ajustats)
      subtotal={calculatedTotals.subtotal}
      discount_amount={calculatedTotals.discountAmount}
      tax_amount={calculatedTotals.taxAmount}
      total_amount={calculatedTotals.totalAmount}
      taxBreakdown={calculatedTotals.taxBreakdown}
    />
  )

  try {
    const buffer = await renderToBuffer(document)
    return buffer
  } catch (error) {
    console.error('Error generant el buffer del PDF del pressupost:', error)
    throw new Error("No s'ha pogut generar el PDF del pressupost.")
  }
}