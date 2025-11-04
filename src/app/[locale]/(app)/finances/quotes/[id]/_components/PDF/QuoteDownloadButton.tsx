'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { QuotePdfDocument } from './QuotePdfDocument'
import { type EditableQuote } from '../../_hooks/useQuoteEditor'
import { type Database } from '@/types/supabase'

type Contact = Database['public']['Tables']['contacts']['Row']
type Team = Database['public']['Tables']['teams']['Row']

interface QuoteDownloadButtonProps {
  quote: EditableQuote
  company: Team | null
  contact: Contact | null
  totals: {
    subtotal: number
    discountAmount: number
    tax: number
    total: number
  }
  className?: string
  t: (key: string) => string
}

export function QuoteDownloadButton({
  quote,
  company,
  contact,
  totals,
  className,
  t,
}: QuoteDownloadButtonProps) {
  const fileName = `pressupost-${quote.quote_number || quote.id}.pdf`

  return (
    <PDFDownloadLink
      document={
        <QuotePdfDocument
          quote={quote}
          company={company}
          contact={contact}
          {...totals}
        />
      }
      fileName={fileName}
      className={className}
    >
      {({ loading, error }) => {
        if (error) {
          console.error('Error generant el PDF per descarregar:', error)
        }

        return (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            size="icon"
            title={t('quoteEditor.downloadPDF')}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>
        )
      }}
    </PDFDownloadLink>
  )
}