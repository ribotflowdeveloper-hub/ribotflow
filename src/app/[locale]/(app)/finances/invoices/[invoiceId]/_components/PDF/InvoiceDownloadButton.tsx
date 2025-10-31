'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { InvoicePDF } from './InvoicePDF'
import { type InvoiceDetail } from '@/types/finances/invoices'
import { type CompanyProfile } from '@/types/settings/team' // 👈 NOU
import { type Contact } from '@/types/crm/contacts' // 👈 NOU

interface InvoiceDownloadButtonProps {
  invoice: InvoiceDetail
  company: CompanyProfile // 👈 NOU: Dades de l'empresa emissora
  contact: Contact | null // 👈 NOU: Dades del client receptor
  className?: string
}

export function InvoiceDownloadButton({
  invoice,
  company, // 👈 NOU
  contact, // 👈 NOU
  className,
}: InvoiceDownloadButtonProps) {
  const fileName = `factura-${invoice.invoice_number || invoice.id}.pdf`

  return (
    <PDFDownloadLink
      // Passem les noves props al component InvoicePDF
      document={
        <InvoicePDF invoice={invoice} company={company} contact={contact} />
      }
      fileName={fileName}
      className={className}
    >
      {({ loading, error }) => {
        if (error) {
          console.error('Error generant el PDF per descarregar:', error)
        }

        return (
          <Button type="button" variant="outline" disabled={loading} className='bg-card'>
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