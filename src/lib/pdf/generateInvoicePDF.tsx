// /lib/pdf/generateInvoicePdfBuffer.ts (o la ruta que tinguis)
import { renderToBuffer } from '@react-pdf/renderer'
import qrcode from 'qrcode'
import { type InvoiceDetail } from '@/types/finances/invoices'

// ✅ 1. Importem els nous tipus necessaris
import { type CompanyProfile } from '@/types/settings/team'
import { type Database } from '@/types/supabase'
type Contact = Database['public']['Tables']['contacts']['Row'] | null

// Ajusta la ruta d'importació per apuntar al component "pur"
import { InvoicePdfDocument } from '@/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/PDF/InvoicePdfDocument'

/**
 * AQUESTA ÉS L'ADAPTADOR DE SERVIDOR.
 * Genera el buffer del PDF per a una factura.
 * * ✅ 2. La signatura de la funció ARA ACCEPTA les dades "en viu"
 */
export async function generateInvoicePdfBuffer(
  invoiceData: InvoiceDetail,
  company: CompanyProfile, // 👈 NOU
  contact: Contact          // 👈 NOU
): Promise<Buffer> {
  
  // 1. Generar el QR Code (això queda igual)
  let qrCodeDataUrl: string | null = null
  if (invoiceData.verifactu_qr_data) {
    try {
      qrCodeDataUrl = await qrcode.toDataURL(invoiceData.verifactu_qr_data)
    } catch (qrErr) {
      console.error('Error generant QR code al servidor:', qrErr)
    }
  }

  // 2. Definir el document PDF utilitzant el component "pur"
  const PdfDocument = (
    <InvoicePdfDocument
      invoice={invoiceData}
      company={company} // 👈 PASSEM LA PROP
      contact={contact} // 👈 PASSEM LA PROP
      qrCodeDataUrl={qrCodeDataUrl}
    />
  )

  // 3. Renderitzar a un buffer
  try {
    const buffer = await renderToBuffer(PdfDocument)
    return buffer
  } catch (error) {
    console.error('Error fatal al renderitzar PDF a buffer:', error)
    throw new Error("No s'ha pogut generar el PDF.")
  }
}