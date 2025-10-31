import { renderToBuffer } from '@react-pdf/renderer'
import qrcode from 'qrcode'
import { type InvoiceDetail } from '@/types/finances/invoices'
// Ajusta la ruta d'importació per apuntar al component "pur"
import { InvoicePdfDocument } from '@/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/PDF/InvoicePdfDocument'

/**
 * AQUESTA ÉS L'ADAPTADOR DE SERVIDOR.
 * Genera el buffer del PDF per a una factura.
 */
export async function generateInvoicePdfBuffer(
  invoiceData: InvoiceDetail,
): Promise<Buffer> {
  // 1. Generar el QR Code (asíncronament, al servidor)
  let qrCodeDataUrl: string | null = null
  if (invoiceData.verifactu_qr_data) {
    try {
      // Fem servir 'await' ja que estem al servidor (sense hooks)
      qrCodeDataUrl = await qrcode.toDataURL(invoiceData.verifactu_qr_data)
    } catch (qrErr) {
      console.error('Error generant QR code al servidor:', qrErr)
      // No aturem la generació del PDF si el QR falla, només log
    }
  }

  // 2. Definir el document PDF utilitzant el component "pur"
  const PdfDocument = (
    <InvoicePdfDocument
      invoice={invoiceData}
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