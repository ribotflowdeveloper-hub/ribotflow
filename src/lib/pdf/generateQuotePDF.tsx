import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePdfDocument } from '@/app/[locale]/(app)/finances/quotes/[id]/_components/PDF/QuotePdfDocument'
import { type EditableQuote } from '@/app/[locale]/(app)/finances/quotes/[id]/_hooks/useQuoteEditor'
import { type Database } from '@/types/supabase'

type Contact = Database['public']['Tables']['contacts']['Row']
type Team = Database['public']['Tables']['teams']['Row']

// Funció HELPER per calcular totals
const calculateQuoteTotals = (
  items: EditableQuote['items'],
  discount: number,
  tax_percent: number
) => {
  const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0)
  const discountAmount = (subtotal * (discount || 0)) / 100
  const taxableBase = subtotal - discountAmount
  const tax = (taxableBase * (tax_percent || 0)) / 100
  const total = taxableBase + tax
  return { subtotal, discountAmount, tax, total }
}

export async function generateQuotePdfBuffer(
  quote: EditableQuote,
  company: Team | null,
  contact: Contact | null
): Promise<Buffer> {
  // Calculem els totals al servidor per assegurar-nos
  const { subtotal, discountAmount, tax, total } = calculateQuoteTotals(
    quote.items || [],
    quote.discount || 0,
    quote.tax_percent || 0
  )

  const document = (
    <QuotePdfDocument
      quote={quote}
      company={company}
      contact={contact}
      subtotal={subtotal}
      discountAmount={discountAmount}
      tax={tax}
      total={total}
    />
  )

  try {
    // ✅ CORRECCIÓ: Eliminat el 'as ReactElement'.
    // renderToBuffer accepta directament el JSX del Document.
    const buffer = await renderToBuffer(document)
    return buffer
  } catch (error) {
    console.error('Error generant el buffer del PDF del pressupost:', error)
    throw new Error("No s'ha pogut generar el PDF del pressupost.")
  }
}