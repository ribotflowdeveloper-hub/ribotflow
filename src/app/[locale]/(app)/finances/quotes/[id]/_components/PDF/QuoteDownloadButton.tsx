'use client'

import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { QuotePdfDocument } from './QuotePdfDocument'
import { type EditableQuote, type Team, type Contact } from '@/types/finances/quotes'
import { saveAs } from 'file-saver'

interface QuoteDownloadButtonProps {
  quote: EditableQuote
  company: Team | null
  contact: Contact | null
  totals: {
    subtotal: number
    discount_amount: number
    tax_amount: number;
    total_amount: number;
    // ✅ Assegurem-nos que està definit aquí
    taxBreakdown?: Record<string, number>; 
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
  const [isGenerating, setIsGenerating] = useState(false)

  const quoteNum = quote.quote_number || String(quote.id) || 'esborrany'
  const fileName = `pressupost-${quoteNum}.pdf`

  const handleDownload = async () => {
    setIsGenerating(true)

    // 🔍 DEBUG: Mirem què conté 'totals' exactament
    console.log("🔍 [QuoteDownloadButton] Totals rebuts:", totals);
    console.log("🔍 [QuoteDownloadButton] Tax Breakdown:", totals.taxBreakdown);
    console.log("🔍 [QuoteDownloadButton] Keys de Breakdown:", totals.taxBreakdown ? Object.keys(totals.taxBreakdown) : "UNDEFINED");

    if (!contact || !company) {
      console.error('Falten dades de contacte o empresa.')
      setIsGenerating(false)
      return
    }

    try {
      const doc = (
        <QuotePdfDocument
          quote={quote}
          company={company}
          contact={contact}
          // ✅ Passem les props explícitament per seguretat
          subtotal={totals.subtotal}
          discount_amount={totals.discount_amount}
          tax_amount={totals.tax_amount}
          total_amount={totals.total_amount}
          taxBreakdown={totals.taxBreakdown} 
        />
      )

      const blob = await pdf(doc).toBlob()
      saveAs(blob, fileName)
    } catch (error) {
      console.error('Error generant el PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isGenerating}
      size="icon"
      title={t('quoteEditor.downloadPDF')}
      className={`${className} bg-card`}
      onClick={handleDownload}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  )
}