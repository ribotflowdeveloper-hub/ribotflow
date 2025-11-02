// /app/[locale]/(app)/finances/invoices/[invoiceId]/_components/PDF/InvoicePdfDocument.tsx

// ❌ NO HA DE SER 'use client'. Els components de react-pdf no són components DOM.
// "use client"; 

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { type InvoiceDetail } from '@/types/finances/invoices'
import { type CompanyProfile } from '@/types/settings/team' // 👈 NOU
import { type Database } from '@/types/supabase' 
type Contact = Database['public']['Tables']['contacts']['Row']

// ... (Els estils 'styles' i les funcions 'formatCurrency', 'formatDate' queden exactament igual)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: '#666',
  },
  invoiceDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  invoiceInfo: {
    fontSize: 10,
    textAlign: 'right',
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerBilling: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#666',
    marginBottom: 4,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderColor: '#EEE',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tableColHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    padding: 6,
  },
  tableCol: {
    padding: 6,
    fontSize: 9,
  },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  itemDescription: {
    fontSize: 8,
    color: '#555',
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsBox: {
    width: '35%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#555',
  },
  totalsValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  totalsRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalsLabelBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  totalsValueBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    textAlign: 'right',
  },
  footer: {
    marginTop: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notes: {
    flex: 1,
    marginRight: 20,
  },
  verifactuContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrCode: {
    width: 80,
    height: 80,
  },
  verifactuText: {
    fontSize: 7,
    marginTop: 4,
    color: '#666',
    width: 100,
    textAlign: 'center',
  },
})

const formatCurrency = (value: number | string | null, currency: string) => {
  const num = Number(value || 0)
  return `${num.toFixed(2)} ${currency}`
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  // Simple format, ja que no tenim 'Intl'
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}


// ❌ 1. ELIMINADA la primera definició duplicada de InvoicePdfDocumentProps
// interface InvoicePdfDocumentProps {
//   invoice: InvoiceDetail
//   qrCodeDataUrl: string | null 
// }

// ✅ 2. AQUESTA ÉS LA DEFINICIÓ CORRECTA de les props
interface InvoicePdfDocumentProps {
  invoice: InvoiceDetail
  company: CompanyProfile
  contact: Contact | null // Pot ser null si no hi ha contacte assignat
  qrCodeDataUrl: string | null
}

/**
 * AQUEST ÉS EL COMPONENT "PUR" REUTILITZABLE.
 */
export function InvoicePdfDocument({
  invoice,
  company,
  contact,
  qrCodeDataUrl,
}: InvoicePdfDocumentProps) {
  // ... (lògica de càlcul de totals) ...
  const subtotal = Number(invoice.subtotal || 0)
  const discount = Number(invoice.discount_amount || 0)
  const shipping = Number(invoice.shipping_cost || 0)
  const tax = Number(invoice.tax_amount || 0)
  const baseImposable = subtotal - discount

  // --- 💡 LÒGICA DE FALLBACK (Correcta) ---
  const companyName = invoice.company_name || company.company_name
  const companyAddress = invoice.company_address || company.company_address
  const companyTaxId = invoice.company_tax_id || company.company_tax_id
  const companyEmail = invoice.company_email || company.company_email
  
  const clientName = invoice.client_name || contact?.nom
  //const clientTaxId = invoice.client_tax_id || contact?.nif // Segueix comentat
  const clientEmail = invoice.client_email || contact?.email

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* --- 1. CAPÇALERA --- */}
        <View style={styles.header}>
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>
              {companyName || 'La Teva Empresa'}
            </Text>
            <Text style={styles.companyAddress}>
              {companyAddress || 'Carrer, 08000 Ciutat'}
            </Text>
            <Text style={styles.companyAddress}>
              {companyTaxId || 'NIF Emissor'}
            </Text>
            <Text style={styles.companyAddress}>
              {companyEmail || 'email@empresa.com'}
            </Text>
          </View>
          <View style={styles.invoiceDetails}>
            <Text style={styles.invoiceTitle}>FACTURA</Text>
            <Text style={styles.invoiceInfo}>
              Núm.: {invoice.invoice_number || `INV-${invoice.id}`}
            </Text>
            <Text style={styles.invoiceInfo}>
              Data: {formatDate(invoice.issue_date)}
            </Text>
            <Text style={styles.invoiceInfo}>
              Venciment: {formatDate(invoice.due_date)}
            </Text>
          </View>
        </View>

        {/* --- 2. INFO CLIENT --- */}
        <View style={styles.customerInfo}>
          <View style={styles.customerBilling}>
            <Text style={styles.sectionTitle}>Facturar A:</Text>
            <Text>{clientName || 'Client no especificat'}</Text>
            {/* <Text style={styles.companyAddress}>
              {clientAddress || 'Adreça client'}
            </Text>
            <Text style={styles.companyAddress}>
              {clientTaxId || 'NIF Client'}
            </Text> */}
            <Text style={styles.companyAddress}>
              {clientEmail || 'Email client'}
            </Text>
          </View>
        </View>

        {/* --- 3. TAULA D'ÍTEMS --- */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colDesc]}>
              Descripció
            </Text>
            <Text style={[styles.tableColHeader, styles.colQty]}>Quant.</Text>
            <Text style={[styles.tableColHeader, styles.colPrice]}>
              Preu Unit.
            </Text>
            <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
          </View>
          {(invoice.invoice_items || []).map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.tableCol, styles.colDesc]}>
                <Text>{item.description || 'Ítem de factura'}</Text>
                {item.reference_sku && (
                  <Text style={styles.itemDescription}>
                    REF: {item.reference_sku}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCol, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCol, styles.colPrice]}>
                {formatCurrency(item.unit_price, invoice.currency || 'EUR')}
              </Text>
              <Text style={[styles.tableCol, styles.colTotal]}>
                {formatCurrency(item.total, invoice.currency || 'EUR')}
              </Text>
            </View>
          ))}
        </View>

        {/* --- 4. TOTALS --- */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(subtotal, invoice.currency || 'EUR')}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descompte</Text>
                <Text style={styles.totalsValue}>
                  -{formatCurrency(discount, invoice.currency || 'EUR')}
                </Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Base Imposable</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(baseImposable, invoice.currency || 'EUR')}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                IVA ({invoice.tax_rate || 0}%)
              </Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(tax, invoice.currency || 'EUR')}
              </Text>
            </View>
            {shipping > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Enviament</Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(shipping, invoice.currency || 'EUR')}
                </Text>
              </View>
            )}
            <View style={styles.totalsRowBold}>
              <Text style={styles.totalsLabelBold}>TOTAL</Text>
              <Text style={styles.totalsValueBold}>
                {formatCurrency(
                  invoice.total_amount,
                  invoice.currency || 'EUR',
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* --- 5. PEU DE PÀGINA --- */}
        <View style={styles.footer}>
          <View style={styles.notes}>
            {invoice.payment_details && (
              <>
                <Text style={styles.sectionTitle}>Detalls de Pagament:</Text>
                <Text>{invoice.payment_details}</Text>
              </>
            )}
            {invoice.terms && (
              <>
                <Text style={styles.sectionTitle}>Termes i Condicions:</Text>
                <Text>{invoice.terms}</Text>
              </>
            )}
          </View>
          {qrCodeDataUrl && (
            <View style={styles.verifactuContainer}>
              <Image style={styles.qrCode} src={qrCodeDataUrl} />
              {invoice.verifactu_uuid && (
                <Text style={styles.verifactuText}>
                  Factura verificable en la sede electrónica de la AEAT. ID:{' '}
                  {invoice.verifactu_uuid}
                </Text>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}