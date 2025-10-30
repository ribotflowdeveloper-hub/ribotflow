// src/lib/pdf/generateInvoicePDF.ts

import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image 
} from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import qrcode from 'qrcode';
import { type InvoiceDetail } from '@/types/finances/invoices'; // Ajusta la ruta si cal

// --- Defineix els estils aquí (els mateixos que a InvoicePDF.tsx) ---
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
});

// --- Helpers de format (també duplicats) ---
const formatCurrency = (value: number | string | null, currency: string) => {
  const num = Number(value || 0);
  return `${num.toFixed(2)} ${currency}`;
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};


/**
 * Aquesta és la funció "externa" que s'executa al servidor.
 * Genera el buffer del PDF per a una factura.
 */
export async function generateInvoicePdfBuffer(invoiceData: InvoiceDetail): Promise<Buffer> {
  // 1. Generar el QR Code (asíncronament)
  let qrCodeDataUrl: string | null = null;
  if (invoiceData.verifactu_qr_data) {
    try {
      qrCodeDataUrl = await qrcode.toDataURL(invoiceData.verifactu_qr_data);
    } catch (qrErr) {
      console.error("Error generant QR code al servidor:", qrErr);
    }
  }

  // Calculem totals
  const subtotal = Number(invoiceData.subtotal || 0);
  const discount = Number(invoiceData.discount_amount || 0);
  const shipping = Number(invoiceData.shipping_cost || 0);
  const tax = Number(invoiceData.tax_amount || 0);
  const baseImposable = subtotal - discount;

  // 2. Definir el document PDF
  const PdfDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* --- 1. CAPÇALERA --- */}
        <View style={styles.header}>
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{invoiceData.company_name || 'La Teva Empresa'}</Text>
            <Text style={styles.companyAddress}>{invoiceData.company_address || 'Carrer, 08000 Ciutat'}</Text>
            <Text style={styles.companyAddress}>{invoiceData.company_tax_id || 'NIF Emissor'}</Text>
            <Text style={styles.companyAddress}>{invoiceData.company_email || 'email@empresa.com'}</Text>
          </View>
          <View style={styles.invoiceDetails}>
            <Text style={styles.invoiceTitle}>FACTURA</Text>
            <Text style={styles.invoiceInfo}>Núm.: {invoiceData.invoice_number || `INV-${invoiceData.id}`}</Text>
            <Text style={styles.invoiceInfo}>Data: {formatDate(invoiceData.issue_date)}</Text>
            <Text style={styles.invoiceInfo}>Venciment: {formatDate(invoiceData.due_date)}</Text>
          </View>
        </View>

        {/* --- 2. INFO CLIENT --- */}
        <View style={styles.customerInfo}>
          <View style={styles.customerBilling}>
            <Text style={styles.sectionTitle}>Facturar A:</Text>
            <Text>{invoiceData.client_name || invoiceData.contacts?.nom || 'Client no especificat'}</Text>
            <Text style={styles.companyAddress}>{invoiceData.client_address || 'Adreça client'}</Text>
            <Text style={styles.companyAddress}>{invoiceData.client_tax_id || 'NIF Client'}</Text>
            <Text style={styles.companyAddress}>{invoiceData.client_email || 'Email client'}</Text>
          </View>
        </View>

        {/* --- 3. TAULA D'ÍTEMS --- */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colDesc]}>Descripció</Text>
            <Text style={[styles.tableColHeader, styles.colQty]}>Quant.</Text>
            <Text style={[styles.tableColHeader, styles.colPrice]}>Preu Unit.</Text>
            <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
          </View>
          {(invoiceData.invoice_items || []).map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.tableCol, styles.colDesc]}>
                <Text>{item.description || 'Ítem de factura'}</Text>
                {item.reference_sku && (
                  <Text style={styles.itemDescription}>REF: {item.reference_sku}</Text>
                )}
              </View>
              <Text style={[styles.tableCol, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCol, styles.colPrice]}>{formatCurrency(item.unit_price, invoiceData.currency || 'EUR')}</Text>
              <Text style={[styles.tableCol, styles.colTotal]}>{formatCurrency(item.total, invoiceData.currency || 'EUR')}</Text>
            </View>
          ))}
        </View>

        {/* --- 4. TOTALS --- */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(subtotal, invoiceData.currency || 'EUR')}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descompte</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(discount, invoiceData.currency || 'EUR')}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Base Imposable</Text>
              <Text style={styles.totalsValue}>{formatCurrency(baseImposable, invoiceData.currency || 'EUR')}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA ({invoiceData.tax_rate || 0}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(tax, invoiceData.currency || 'EUR')}</Text>
            </View>
            {shipping > 0 && (
               <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Enviament</Text>
                <Text style={styles.totalsValue}>{formatCurrency(shipping, invoiceData.currency || 'EUR')}</Text>
              </View>
            )}
            <View style={styles.totalsRowBold}>
              <Text style={styles.totalsLabelBold}>TOTAL</Text>
              <Text style={styles.totalsValueBold}>{formatCurrency(invoiceData.total_amount, invoiceData.currency || 'EUR')}</Text>
            </View>
          </View>
        </View>

        {/* --- 5. PEU DE PÀGINA (NOTES I VERIFACTU) --- */}
        <View style={styles.footer}>
          <View style={styles.notes}>
            {invoiceData.payment_details && (
              <>
                <Text style={styles.sectionTitle}>Detalls de Pagament:</Text>
                <Text>{invoiceData.payment_details}</Text>
              </>
            )}
            {invoiceData.terms && (
              <>
                <Text style={styles.sectionTitle}>Termes i Condicions:</Text>
                <Text>{invoiceData.terms}</Text>
              </>
            )}
          </View>
          {qrCodeDataUrl && (
            <View style={styles.verifactuContainer}>
              <Image
                style={styles.qrCode}
                src={qrCodeDataUrl}
              />
              {invoiceData.verifactu_uuid && (
                <Text style={styles.verifactuText}>
                  Factura verificable en la sede electrónica de la AEAT. ID: {invoiceData.verifactu_uuid}
                </Text>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );

  // 3. Renderitzar a un buffer
  try {
    const buffer = await renderToBuffer(PdfDocument);
    return buffer;
  } catch (error) {
    console.error("Error fatal al renderitzar PDF a buffer:", error);
    throw new Error("No s'ha pogut generar el PDF.");
  }
}