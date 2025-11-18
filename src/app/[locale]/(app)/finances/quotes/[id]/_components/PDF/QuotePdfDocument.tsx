import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { type EditableQuote, type Team, type Contact, type QuoteItem } from '@/types/finances/quotes'

// --- Helpers ---
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

// ✅ Helper local per calcular el total de línia (Base + Impostos - Retencions)
// Això garanteix que el PDF mostri el mateix valor que la pantalla.
const calculateLineTotal = (item: Partial<QuoteItem>) => {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const base = quantity * price;

  let taxSum = 0;
  if (item.taxes && item.taxes.length > 0) {
    item.taxes.forEach(tax => {
      const amount = base * (tax.rate / 100);
      if (tax.type === 'retention') {
        taxSum -= amount;
      } else {
        taxSum += amount;
      }
    });
  }
  return base + taxSum;
};


// --- Estils ---
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#333', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', paddingBottom: 8 },
  logo: { maxWidth: 100, height: 70, objectFit: 'contain' },
  logoPlaceholder: { height: 48, width: 112, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  logoPlaceholderText: { color: '#9ca3af', fontSize: 9 },
  headerRight: { textAlign: 'right', marginLeft: 8 },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 16 },
  quoteNumber: { color: '#6b7280', fontSize: 14, marginTop: 2 },
  section: { flexDirection: 'row', gap: 32, marginVertical: 16 },
  sectionColumn: { flex: 1 },
  sectionColumnRight: { flex: 1, textAlign: 'right' },
  textBold: { fontFamily: 'Helvetica-Bold' },
  textGray: { color: '#4b5563' },
  sectionDates: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  dateBox: { textAlign: 'left' },
  dateBoxRight: { textAlign: 'right' },
  dateLabel: { fontSize: 9, color: '#6b7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },

  // Taula
  table: { width: '100%' },
  tableHeader: { backgroundColor: '#f3f4f6', flexDirection: 'row' },
  tableHeaderCell: { padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableCell: { padding: 6, fontSize: 10 },

  // Columnes
  colDesc: { width: '40%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTax: { width: '15%', textAlign: 'right' }, // Nova columna
  colTotal: { width: '20%', textAlign: 'right' },

  textMedium: { fontFamily: 'Helvetica-Bold' },

  // Totals
  totalsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  totalsBox: { width: '45%' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalsRowGreen: { flexDirection: 'row', justifyContent: 'space-between', color: '#059669', marginBottom: 3 },
  totalsFinal: { flexDirection: 'row', justifyContent: 'space-between', fontFamily: 'Helvetica-Bold', fontSize: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#111827' },

  footer: { marginTop: 40, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  footerTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  footerNotes: { fontSize: 10, color: '#4b5563' },
})

interface QuotePdfDocumentProps {
  quote: EditableQuote
  company: Team | null
  contact: Contact | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  taxBreakdown?: Record<string, number>
}

export function QuotePdfDocument({
  quote,
  company,
  contact,
  subtotal,
  discount_amount,
  tax_amount,
  total_amount,
  taxBreakdown = {},
}: QuotePdfDocumentProps) {
  const base = subtotal - discount_amount
  const showQuantity = quote.show_quantity ?? true
  const showTaxColumn = quote.show_quantity ?? true // ✅ Llegim preferència

  // Amplada dinàmica
  let descWidth = 40;
  if (!showQuantity) descWidth += 25;
  if (!showTaxColumn) descWidth += 15;
  console.log("🔍 [QuotePdfDocument] taxBreakdown:", taxBreakdown);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          {company?.logo_url ? (
            <Image src={company.logo_url} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>Logo</Text>
            </View>
          )}
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{company?.name || 'La Teva Empresa'}</Text>
            <Text style={styles.quoteNumber}># {quote.quote_number || 'Pendent'}</Text>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.section}>
          <View style={styles.sectionColumn}>
            <Text style={styles.textBold}>{company?.name || 'La Teva Empresa'}</Text>
            <Text style={styles.textGray}>{company?.address}</Text>
            <Text style={styles.textGray}>{company?.tax_id}</Text>
            <Text style={styles.textGray}>{company?.email}</Text>
          </View>
          <View style={styles.sectionColumnRight}>
            <Text style={styles.textBold}>{contact?.nom || 'Client no seleccionat'}</Text>
            <Text style={styles.textGray}>{contact?.empresa}</Text>
            <Text style={styles.textGray}>{contact?.email}</Text>
          </View>
        </View>

        {/* DATES */}
        <View style={styles.sectionDates}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Data d'emissió</Text>
            <Text>{formatDate(quote.issue_date || new Date().toISOString())}</Text>
          </View>
          <View style={styles.dateBoxRight}>
            <Text style={styles.dateLabel}>Data de venciment</Text>
            <Text>{formatDate(quote.expiry_date ?? null)}</Text>
          </View>
        </View>

        {/* TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: `${descWidth}%` }]}>
              Ítem
            </Text>
            {showQuantity && (
              <>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>Quant.</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice]}>Preu</Text>
              </>
            )}
            {showTaxColumn && (
              <Text style={[styles.tableHeaderCell]}>Impostos</Text>
            )}
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>
              Total
            </Text>
          </View>

          {(quote.items || []).map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: `${descWidth}%` }]}>
                {item.description || 'Sense descripció'}
              </Text>

              {showQuantity && (
                <>
                  <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity ?? 1)}</Text>
                  <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unit_price ?? 0)}</Text>
                </>
              )}

              {/* ✅ COLUMNA IMPOSTOS */}
              {showTaxColumn && (
                <View style={[styles.tableCell, styles.colTax]}>
                  {item.taxes && item.taxes.length > 0 ? (
                    item.taxes.map((t, i) => (
                      <Text key={i} style={{ fontSize: 8, color: '#6b7280' }}>
                        {t.name} ({t.rate}%)
                      </Text>
                    ))
                  ) : (
                    <Text style={{ fontSize: 8, color: '#9ca3af' }}>-</Text>
                  )}
                </View>
              )}

              {/* ✅ TOTAL CALCULAT (Amb el helper) */}
              <Text style={[styles.tableCell, styles.textMedium, styles.colTotal]}>
                {formatCurrency(calculateLineTotal(item))}
              </Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.textGray}>Subtotal:</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </View>

            {discount_amount > 0 && (
              <View style={styles.totalsRowGreen}>
                <Text>Descompte</Text>
                <Text>-{formatCurrency(discount_amount)}</Text>
              </View>
            )}

            <View style={styles.totalsRow}>
              <Text style={styles.textGray}>Base Imposable:</Text>
              <Text>{formatCurrency(base)}</Text>
            </View>

            {/* ✅ DESGLOSSAMENT D'IMPOSTOS */}
            {Object.entries(taxBreakdown).length > 0 ? (
              Object.entries(taxBreakdown).map(([name, amount]) => (
                <View key={name} style={styles.totalsRow}>
                  <Text style={styles.textGray}>{name}</Text>
                  <Text>{formatCurrency(amount)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.totalsRow}>
                <Text style={styles.textGray}>Impostos</Text>
                <Text>0.00 €</Text>
              </View>
            )}

            <View style={styles.totalsFinal}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
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