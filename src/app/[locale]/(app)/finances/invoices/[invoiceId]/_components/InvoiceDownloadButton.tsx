// src/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceDownloadButton.tsx
'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { InvoicePDF } from './InvoicePDF' 
import { type InvoiceDetail } from '@/types/finances/invoices'

interface InvoiceDownloadButtonProps {
  invoice: InvoiceDetail
  className?: string
}

export function InvoiceDownloadButton({ invoice, className }: InvoiceDownloadButtonProps) {
  const fileName = `factura-${invoice.invoice_number || invoice.id}.pdf`

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} />}
      fileName={fileName}
      className={className}
    >
      {({ loading, error }) => {
        if (error) {
          console.error("Error generant el PDF per descarregar:", error)
        }

        return (
          <Button 
            type="button" // ✅ AQUESTA ÉS LA CORRECCIÓ
            variant="outline" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Descarregar PDF
          </Button>
        )
      }}
    </PDFDownloadLink>
  )
}