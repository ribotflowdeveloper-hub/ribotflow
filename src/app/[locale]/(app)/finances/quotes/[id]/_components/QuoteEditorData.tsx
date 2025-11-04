// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteEditorData.tsx (CORREGIT)

import { redirect } from 'next/navigation'
import { QuoteEditorClient } from './QuoteEditorClient'
import { validatePageSession } from '@/lib/supabase/session'
import type { Database } from '@/types/supabase'
import crypto from 'crypto' // Per al randomUUID del newQuote

// --- Tipus Derivats ---
type Quote = Database['public']['Tables']['quotes']['Row']
type QuoteItem = Database['public']['Tables']['quote_items']['Row']
type Opportunity = Database['public']['Tables']['opportunities']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type QuoteDetailsResponse = {
  quote: Quote & { items: QuoteItem[] }
  opportunities: Opportunity[]
}

interface QuoteEditorDataProps {
  quoteId: string
  locale: string
}

type NewQuote = Omit<Quote, 'id' | 'created_at'> & {
  id: 'new'
  items: Partial<QuoteItem>[]
  created_at: string
}
type InitialQuoteType = (Quote & { items: QuoteItem[] }) | NewQuote

export async function QuoteEditorData({
  quoteId,
  locale,
}: QuoteEditorDataProps) {
  const { supabase, user, activeTeamId } = await validatePageSession()

  // --- LÒGICA PER A UN PRESSUPOST NOU ---
  if (quoteId === 'new') {
    const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('team_id', activeTeamId), // Afegit filtre team_id
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('team_id', activeTeamId),
      supabase.from('teams').select('*').eq('id', activeTeamId).single(),
      supabase
        .from('quotes')
        .select('sequence_number')
        .eq('team_id', activeTeamId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (
      contactsRes.error ||
      productsRes.error ||
      teamRes.error ||
      lastQuoteRes.error
    ) {
      console.error('Error en carregar les dades per a un nou pressupost:', {
        contacts: contactsRes.error,
        products: productsRes.error,
        team: teamRes.error,
        lastQuote: lastQuoteRes.error,
      })
      return <div>Error en carregar les dades de l'editor.</div>
    }

    const lastSequence = lastQuoteRes.data?.sequence_number || 0
    const nextSequence = lastSequence + 1
    const year = new Date().getFullYear()
    const formattedQuoteNumber = `PRE-${year}-${String(
      nextSequence
    ).padStart(4, '0')}`

    const initialQuote: NewQuote = {
      id: 'new',
      team_id: activeTeamId,
      user_id: user.id,
      contact_id: null,
      opportunity_id: null,
      quote_number: formattedQuoteNumber,
      sequence_number: nextSequence,
      issue_date: new Date().toISOString().slice(0, 10),
      expiry_date: null,
      status: 'Draft',
      notes: 'Gràcies pel vostre interès en els nostres serveis.',
      subtotal: 0,
      discount: 0,
      tax: 0,
      tax_percent: 21,
      total: 0,
      show_quantity: true,
      created_at: new Date().toISOString(),
      sent_at: null,
      rejection_reason: null,
      send_at: null,
      theme_color: null,
      secure_id: crypto.randomUUID(),
      items: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0,
        },
      ],
    }

    return (
      <QuoteEditorClient
        initialQuote={initialQuote as InitialQuoteType}
        contacts={contactsRes.data || []}
        products={productsRes.data || []}
        companyProfile={teamRes.data as Team | null}
        initialOpportunities={[]}
        userId={user.id}
        locale={locale}
        // ❌ Prop 'pdfUrl' eliminada. Ja no és necessària.
      />
    )
  }

  // --- LÒGICA PER A EDITAR UN PRESSUPOST EXISTENT ---
  const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise.all([
    supabase.from('contacts').select('*').eq('team_id', activeTeamId), // Afegit filtre
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('team_id', activeTeamId),
    supabase.from('teams').select('*').eq('id', activeTeamId).single(),
    supabase
      .rpc('get_quote_details', { p_quote_id: Number(quoteId) })
      .single<QuoteDetailsResponse>(),
  ])

  if (
    contactsRes.error ||
    productsRes.error ||
    teamRes.error ||
    quoteDetailsRes.error
  ) {
    console.error("Error en carregar les dades d'un pressupost existent:", {
      /* ... errors ... */
    })
    return <div>Error en carregar les dades de l'editor.</div>
  }

  const quoteDetails = quoteDetailsRes.data

  if (!quoteDetails?.quote) {
    redirect(`/${locale}/finances/quotes`) // Canviat de 'crm/quotes' a 'finances/quotes'
  }

  // ❌ LÒGICA ELIMINADA: Ja no busquem 'createSignedUrl'.
  // El PDF es genera al client.

  return (
    <QuoteEditorClient
      initialQuote={quoteDetails.quote}
      contacts={contactsRes.data || []}
      products={productsRes.data || []}
      companyProfile={teamRes.data as Team | null}
      initialOpportunities={quoteDetails.opportunities || []}
      userId={user.id}
      locale={locale}
      // ❌ Prop 'pdfUrl' eliminada. Ja no és necessària.
    />
  )
}