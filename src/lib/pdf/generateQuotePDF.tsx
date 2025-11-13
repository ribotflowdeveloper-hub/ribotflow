// /src/lib/pdf/generateQuotePDF.ts (O on tinguis aquesta funció)

import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePdfDocument } from '@/app/[locale]/(app)/finances/quotes/[id]/_components/PDF/QuotePdfDocument'
import { type EditableQuote } from '@/app/[locale]/(app)/finances/quotes/[id]/_hooks/useQuoteEditor'
import { type Database } from '@/types/supabase'

type Contact = Database['public']['Tables']['contacts']['Row']
type Team = Database['public']['Tables']['teams']['Row']

// ⛔ AQUESTA FUNCIÓ ÉS L'ARREL DEL PROBLEMA. LA LÒGICA ÉS ANTIGA.
// const calculateQuoteTotals = ( ... ) => { ... }
// ⛔ LA PODEM ELIMINAR COMPLETAMENT.

export async function generateQuotePdfBuffer(
  quote: EditableQuote, // Aquest 'quote' ve de la BDD (via 'sendQuote')
  company: Team | null,
  contact: Contact | null
): Promise<Buffer> {
  
  // ✅✅✅ INICI DE LA SOLUCIÓ ✅✅✅

  // 1. NO RECALCULEM. Utilitzem els valors que ja estan desats a la BDD.
  const subtotal = quote.subtotal || 0
  const discountAmount = quote.discount_amount || 0 // 👈 Llegim el camp NOU
  const taxAmount = quote.tax_amount || 0 // 👈 Llegim el camp NOU
  const totalAmount = quote.total_amount || 0 // 👈 Llegim el camp NOU

  // 2. Mapegem els camps de % per al PDF
  // El 'QuotePdfDocument' (que vam corregir) espera 'discount_percent_input'
  // per mostrar el percentatge. El desem a la BDD al camp 'discount'.
  const quoteForPdf: EditableQuote = {
    ...quote,
    discount_percent_input: quote.discount_amount ?? 0, // 👈 Llegim el % que vam desar
    tax_percent_input: quote.tax_rate ?? 21, // 👈 Llegim el % que vam desar
  };
  // ✅✅✅ FI DE LA SOLUCIÓ ✅✅✅

  const document = (
    <QuotePdfDocument
      quote={quoteForPdf} // 👈 Passem el 'quote' mapejat
      company={company}
      contact={contact}
      
      // ✅ 3. Passem les props amb els noms correctes
      subtotal={subtotal}
      discount_amount={discountAmount} // 👈 Prop correcta
      tax_amount={taxAmount} // 👈 Prop correcta
      total_amount={totalAmount} // 👈 Prop correcta
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