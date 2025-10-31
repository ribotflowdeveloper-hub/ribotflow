'use client'

import { useState, useEffect } from 'react'
import qrcode from 'qrcode'
import { type InvoiceDetail } from '@/types/finances/invoices'
import { InvoicePdfDocument } from './InvoicePdfDocument'
import { type CompanyProfile } from '@/types/settings/team' // 👈 NOU
import { type Contact } from '@/types/crm/contacts' // 👈 NOU

/**
 * Hook per generar el QR (només s'usa al client)
 */
function useVerifactuQR(qrData: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!qrData) {
      setDataUrl(null)
      return
    }

    let isMounted = true
    qrcode.toDataURL(qrData, (err, url) => {
      if (isMounted) {
        if (err) {
          console.error('Error generant QR code:', err)
          setDataUrl(null)
        } else {
          setDataUrl(url)
        }
      }
    })

    return () => {
      isMounted = false
    }
  }, [qrData])

  return dataUrl
}

interface InvoicePDFProps {
  invoice: InvoiceDetail
  company: CompanyProfile // 👈 NOU
  contact: Contact | null // 👈 NOU
}

/**
 * AQUEST ÉS L'ADAPTADOR DE CLIENT.
 * S'encarrega de la lògica de client (el hook del QR)
 * i passa TOTES les dades al document "pur".
 */
export function InvoicePDF({ invoice, company, contact }: InvoicePDFProps) {
  const qrCodeDataUrl = useVerifactuQR(invoice.verifactu_qr_data)

  // Passem la factura, les dades "en viu" i la URL del QR
  // al component de document compartit.
  return (
    <InvoicePdfDocument
      invoice={invoice}
      company={company}
      contact={contact}
      qrCodeDataUrl={qrCodeDataUrl}
    />
  )
}