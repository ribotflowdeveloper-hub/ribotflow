'use client'

import React, { useState } from 'react'
// ✅ 1. Importem 'pdf' en lloc de 'PDFDownloadLink'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { QuotePdfDocument } from './QuotePdfDocument' // El teu document PDF
import { type EditableQuote } from '../../_hooks/useQuoteEditor'
import { type Database } from '@/types/supabase'
// ✅ 2. Importem 'saveAs' per gestionar la descàrrega
import { saveAs } from 'file-saver'

// --- Tipus (es mantenen igual) ---
type Contact = Database['public']['Tables']['contacts']['Row']
type Team = Database['public']['Tables']['teams']['Row']

interface QuoteDownloadButtonProps {
  quote: EditableQuote
  company: Team | null
  contact: Contact | null
  totals: {
    subtotal: number
    discount_amount: number
    tax_amount: number
    total_amount: number
  }
  className?: string
  t: (key: string) => string
}

export function QuoteDownloadButton({
  quote,
  company,
  contact,
  totals,
  className,
  t,
}: QuoteDownloadButtonProps) {
  // ✅ 3. Afegim un estat local per controlar la generació
  const [isGenerating, setIsGenerating] = useState(false)

  const fileName = `pressupost-${quote.quote_number || quote.id}.pdf`

  // ✅ 4. Creem la funció de descàrrega imperativa
  const handleDownload = async () => {
    setIsGenerating(true)

    // Validació important: No intentis generar un PDF sense dades clau
    if (!contact || !company) {
      console.error('Falten dades de contacte o empresa per generar el PDF.')
      // Aquí podries mostrar un toast d'error
      setIsGenerating(false)
      return
    }

    try {
      // Pas 1: Defineix l'element del document
      const doc = (
        <QuotePdfDocument
          quote={quote}
          company={company}
          contact={contact}
          // Passem els totals desestructurats (com ja feies)
          {...totals}
        />
      )

      // Pas 2: Genera el PDF com a Blob
      // Aquest és el moment on pot fallar si 'QuotePdfDocument' té
      // el problema de tipus (Number vs String)
      const blob = await pdf(doc).toBlob()

      // Pas 3: Inicia la descàrrega amb file-saver
      saveAs(blob, fileName)
    } catch (error) {
      console.error('Error generant el PDF on-demand:', error)
      // Aquí és on veuries l'error si 'QuotePdfDocument' segueix incorrecte
      // Mostra un toast a l'usuari informant de l'error
    } finally {
      setIsGenerating(false)
    }
  }

  // ✅ 5. El JSX ara és un simple botó que crida 'handleDownload'
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isGenerating} // Desactivat mentre es genera
      size="icon"
      title={t('quoteEditor.downloadPDF')}
      className={`${className} bg-card`}
      onClick={handleDownload} // El 'onClick' ara és la nostra funció
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  )
}