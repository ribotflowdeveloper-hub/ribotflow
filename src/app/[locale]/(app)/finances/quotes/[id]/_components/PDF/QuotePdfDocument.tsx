// /src/app/[locale]/(app)/finances/quotes/[id]/_components/PDF/QuotePdfDocument.tsx (CORREGIT)
// NO 'use client'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { type EditableQuote } from '../../_hooks/useQuoteEditor'
import { type Database } from '@/types/supabase'

// Defineix els tipus com ho fas a InvoicePdfDocument
type Contact = Database['public']['Tables']['contacts']['Row']
type Team = Database['public']['Tables']['teams']['Row']

// --- Helpers de Format ---
const formatCurrency = (value: number | null) => {
  const num = Number(value || 0)
  return `${num.toFixed(2)} €`
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return 'Data invàlida'
  }
}

// --- Estils (Traducció de Tailwind) ---
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  logo: {
    maxWidth: 100,
    height: 70,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    height: 48,
    width: 112,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    color: '#9ca3af',
    fontSize: 9,
  },
  headerRight: {
    textAlign: 'right',
    marginLeft: 8,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
  },
  quoteNumber: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    flexDirection: 'row',
    gap: 32,
    marginVertical: 16,
  },
  sectionColumn: {
    flex: 1,
  },
  sectionColumnRight: {
    flex: 1,
    textAlign: 'right',
  },
  textBold: {
    fontFamily: 'Helvetica-Bold',
  },
  textGray: {
    color: '#4b5563',
  },
  sectionDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  dateBox: {
    textAlign: 'left',
  },
  dateBoxRight: {
    textAlign: 'right',
  },
  dateLabel: {
    fontSize: 9,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    padding: 6,
    fontSize: 10,
  },
  colDesc: {
    width: '50%',
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '15%',
    textAlign: 'right',
  },
  colTotal: {
    width: '20%',
    textAlign: 'right',
  },
  colDescNoQty: {
    width: '80%',
  },
  colTotalNoQty: {
    width: '20%',
    textAlign: 'right',
  },
  textMedium: {
    fontFamily: 'Helvetica-Bold',
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  totalsBox: {
    width: '35%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalsRowGreen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#059669',
    marginBottom: 3,
  },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#111827',
  },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerTitle: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  footerNotes: {
    fontSize: 10,
    color: '#4b5563',
  },
})

// --- Props del Document ---
interface QuotePdfDocumentProps {
  quote: EditableQuote
  company: Team | null
  contact: Contact | null
  subtotal: number
  discountAmount: number
  tax: number
  total: number
}

// --- Component Pur del PDF ---
export function QuotePdfDocument({
  quote,
  company,
  contact,
  subtotal,
  discountAmount,
  tax,
  total,
}: QuotePdfDocumentProps) {
  const base = subtotal - discountAmount
  const showQuantity = quote.show_quantity ?? true

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* --- CAPÇALERA --- */}
        <View style={styles.header}>
          {/* ✅ CORRECCIÓ LOGO: Simplificat per a més fiabilitat */}
          {company?.logo_url ? (
            <Image
              src={company.logo_url} // Passem la URL pública directament
              style={styles.logo}
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>Logo</Text>
            </View>
          )}
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>
              {company?.name || 'La Teva Empresa'}
            </Text>
            <Text style={styles.quoteNumber}>
              # {quote.quote_number || 'Pendent'}
            </Text>
          </View>
        </View>

        {/* --- INFO EMPRESA / CLIENT --- */}
        <View style={styles.section}>
          <View style={styles.sectionColumn}>
            <Text style={styles.textBold}>
              {company?.name || 'La Teva Empresa'}
            </Text>
            <Text style={styles.textGray}>{company?.address}</Text>
            <Text style={styles.textGray}>{company?.tax_id}</Text>
            <Text style={styles.textGray}>{company?.email}</Text>
          </View>
          <View style={styles.sectionColumnRight}>
            <Text style={styles.textBold}>
              {contact?.nom || 'Client no seleccionat'}
            </Text>
            <Text style={styles.textGray}>{contact?.empresa}</Text>
            <Text style={styles.textGray}>{contact?.email}</Text>
          </View>
        </View>

        {/* --- DATES --- */}
        <View style={styles.sectionDates}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Data d'emissió</Text>
            <Text>{formatDate(quote.issue_date)}</Text>
          </View>
          <View style={styles.dateBoxRight}>
            <Text style={styles.dateLabel}>Data de venciment</Text>
            <Text>{formatDate(quote.expiry_date)}</Text>
          </View>
        </View>

        {/* --- TAULA D'ÍTEMS --- */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text
              style={[
                styles.tableHeaderCell,
                showQuantity ? styles.colDesc : styles.colDescNoQty,
              ]}
            >
              Ítem
            </Text>
            {showQuantity && (
              <>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>
                  Quant.
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice]}>
                  Preu
                </Text>
              </>
            )}
            <Text
              style={[
                styles.tableHeaderCell,
                showQuantity ? styles.colTotal : styles.colTotalNoQty,
              ]}
            >
              Total
            </Text>
          </View>

          {/* Body */}
          {(quote.items || []).map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  showQuantity ? styles.colDesc : styles.colDescNoQty,
                ]}
              >
                {item.description}
              </Text>
              {showQuantity && (
                <>
                  <Text style={[styles.tableCell, styles.colQty]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrice]}>
                    {formatCurrency(item.unit_price ?? 0)}
                  </Text>
                </>
              )}
              <Text
                style={[
                  styles.tableCell,
                  styles.textMedium,
                  showQuantity ? styles.colTotal : styles.colTotalNoQty,
                ]}
              >
                {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
              </Text>
            </View>
          ))}
        </View>

        {/* --- TOTALS --- */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.textGray}>Subtotal:</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </View>

            {quote.discount && quote.discount > 0 && (
              <View style={styles.totalsRowGreen}>
                <Text>Descompte ({quote.discount}%)</Text>
                <Text>-{formatCurrency(discountAmount)}</Text>
              </View>
            )}

            <View style={styles.totalsRow}>
              <Text style={styles.textGray}>Base Imposable:</Text>
              <Text>{formatCurrency(base)}</Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.textGray}>IVA ({quote.tax_percent ?? 21}%)</Text>
              <Text>{formatCurrency(tax)}</Text>
            </View>

            <View style={styles.totalsFinal}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* --- PEU DE PÀGINA (NOTES) --- */}
        {quote.notes && (
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Notes i Condicions</Text>
            <Text style={styles.footerNotes}>{quote.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}