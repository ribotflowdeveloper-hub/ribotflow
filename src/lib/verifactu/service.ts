import { type InvoiceDetail, type InvoiceItem } from '@/types/finances/invoices'

/**
 * Defineix la càrrega de dades (payload) que la nostra funció
 * enviarà a l'API externa de VeriFactu.
 * * NOTA: Això és una suposició basada en la teva lògica MOCK.
 * Has d'ajustar aquests camps als camps REALS que l'API d'Hisenda
 * o del teu proveïdor de SIF (Sistema d'Informació de Facturació) requereixi.
 */
interface VeriFactuItemPayload {
  description: string | null
  quantity: number | null
  unitPrice: number | null // L'API segurament voldrà el preu unitari, no el total
}

interface VeriFactuPayload {
  nifEmisor: string
  nifReceptor: string
  numeroFactura: string
  fechaExpedicion: string
  totalFactura: number
  items: VeriFactuItemPayload[]
  firmaPrevia: string | null // Encadenament
  // ... Altres camps que l'API requereixi (ex: impostos desglossats, etc.)
}

/**
 * Defineix la resposta que esperem rebre de l'API de VeriFactu
 * un cop registren la factura.
 */
interface VeriFactuResponse {
  uuid: string       // L'identificador únic del registre (ex: "T-123-ABC")
  qrData: string     // La URL o text complet per generar el QR (ex: "https://aeat.es/verifactu/T-123-ABC")
  signature: string  // La signatura digital d'aquesta factura (per encadenar la següent)
}

/**
 * Registra una factura al sistema VeriFactu (API externa).
 *
 * @param invoice - L'objecte de factura complet, incloent els 'invoice_items'.
 * @param previousSignature - La signatura de l'última factura emesa per aquest equip.
 * @returns Un objecte amb les dades de VeriFactu si té èxit, o un error.
 */
export async function registerInvoiceWithHacienda(
  invoice: InvoiceDetail & { invoice_items: InvoiceItem[] },
  previousSignature: string | null,
): Promise<
  { success: true; data: VeriFactuResponse } | { success: false; error: string }
> {
  
  // 1. Mapejar les nostres dades (InvoiceDetail) al format de l'API (VeriFactuPayload)
  // Aquesta és la part més important i depèn 100% de la documentació de l'API.
  const payload: VeriFactuPayload = {
    nifEmisor: invoice.company_tax_id || '',
    nifReceptor: invoice.client_tax_id || '',
    numeroFactura: invoice.invoice_number || `INV-${invoice.id}`,
    fechaExpedicion: invoice.issue_date || new Date().toISOString(),
    totalFactura: invoice.total_amount || 0,
    firmaPrevia: previousSignature,
    items: (invoice.invoice_items || []).map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    // ... Assegura't d'omplir tots els camps obligatoris de l'API
  }

  // 2. Comprovar variables d'entorn (bona pràctica)
  if (
    !process.env.VERIFACTU_API_ENDPOINT ||
    !process.env.VERIFACTU_API_KEY
  ) {
    console.error('Error: Manca la configuració de VERIFACTU_API')
    return {
      success: false,
      error: 'El servei de facturació no està configurat.',
    }
  }

  // 3. Cridar a l'API real (amb autenticació, etc.)
  try {
    const response = await fetch(process.env.VERIFACTU_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // L'autenticació pot variar (Bearer token, ApiKey, OAuth...)
        'Authorization': `Bearer ${process.env.VERIFACTU_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      // Si l'API retorna un error (400, 401, 500...), intentem llegir-lo
      const errorBody = await response.text()
      console.error('Error API VeriFactu:', errorBody)
      return {
        success: false,
        error: `Error d'Hisenda (${response.status}): ${
          errorBody || response.statusText
        }`,
      }
    }

    // L'API ha respost correctament (200 o 201)
    const data: VeriFactuResponse = await response.json()

    // Validació simple de la resposta
    if (!data.uuid || !data.qrData || !data.signature) {
        console.error("Resposta invàlida de l'API VeriFactu:", data);
        return { success: false, error: "La resposta del servei de facturació és incompleta."}
    }

    return { success: true, data }

  } catch (error) {
    // Error de xarxa (fetch ha fallat, no hi ha connexió, etc.)
    console.error('Error de xarxa VeriFactu:', error)
    return {
      success: false,
      error: "Error de connexió amb el servei de facturació.",
    }
  }
}