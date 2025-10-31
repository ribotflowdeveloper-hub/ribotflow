'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { InvoicePDF } from './InvoicePDF'
import { type InvoiceDetail } from '@/types/finances/invoices'
import { type CompanyProfile } from '@/types/settings/team' 
// ❌ Eliminem la importació incorrecta que defineix 'id' com a 'string'
// import { type Contact } from '@/types/crm/contacts' 
import { type Database } from '@/types/supabase' // ✅ 1. Importem el tipus base de Supabase

// ✅ 2. Definim el tipus 'Contact' correcte basat en la BD (on 'id' és 'number')
type Contact = Database['public']['Tables']['contacts']['Row']

interface InvoiceDownloadButtonProps {
  invoice: InvoiceDetail
  company: CompanyProfile 
  // ✅ 3. L'interface ara espera el tipus 'Contact' correcte (amb id: number)
  contact: Contact | null 
  className?: string
}

export function InvoiceDownloadButton({
  invoice,
  company, 
  contact, 
  className,
}: InvoiceDownloadButtonProps) {
  const fileName = `factura-${invoice.invoice_number || invoice.id}.pdf`

  return (
    <PDFDownloadLink
      // Passem les noves props al component InvoicePDF
      document={
        // ℹ️ ATENCIÓ: Ara l'error es mourà aquí.
        // Hauràs de fer aquest mateix canvi de tipus a 'InvoicePDF.tsx'
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