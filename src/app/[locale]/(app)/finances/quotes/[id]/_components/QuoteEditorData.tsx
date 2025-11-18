import { redirect } from 'next/navigation'
import { QuoteEditorClient } from './QuoteEditorClient'
import { validatePageSession } from '@/lib/supabase/session'
import type { Database } from '@/types/supabase'
import { type EditableQuote } from '@/types/finances/quotes'
import crypto from 'crypto'

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

// ✅ Tipus local net, sense coses d'Invoices
type NewQuoteLocal = Omit<Quote, 'id' | 'created_at'> & {
  id: 'new'
  items: Partial<QuoteItem>[]
  created_at: string
  
  // Camps visuals opcionals
  discount_percent_input?: number | null
  tax_percent_input?: number | null
  
  // Camps per compatibilitat estricta (si existeixen a la BD quotes)
  tax_rate?: number | null
  legacy_tax_amount?: number | null
  legacy_tax_rate?: number | null
  retention_amount?: number | null
}

export async function QuoteEditorData({ quoteId, locale }: QuoteEditorDataProps) {
  const { supabase, user, activeTeamId } = await validatePageSession()

  // 1. Consultes Comunes
  const commonQueries = [
    supabase.from('contacts').select('*').eq('team_id', activeTeamId),
    supabase.from('products').select('*').eq('is_active', true).eq('team_id', activeTeamId),
    supabase.from('teams').select('*').eq('id', activeTeamId).single(),
    // ❌ NO carreguem taxes aquí. Ho fa el client.
  ] as const;

  // --- LÒGICA NOU PRESSUPOST ---
  if (quoteId === 'new') {
    const [contactsRes, productsRes, teamRes, lastQuoteRes] = await Promise.all([
      ...commonQueries,
      supabase
        .from('quotes')
        .select('sequence_number')
        .eq('team_id', activeTeamId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (contactsRes.error || productsRes.error || teamRes.error) {
      console.error("❌ [QuoteEditorData] Error carregant dades inicials:", {
          contacts: contactsRes.error,
          products: productsRes.error,
          team: teamRes.error,
      });
      return <div>Error carregant dades de l'editor.</div>
    }

    const nextSequence = (lastQuoteRes.data?.sequence_number || 0) + 1;
    const year = new Date().getFullYear();
    const formattedQuoteNumber = `PRE-${year}-${String(nextSequence).padStart(4, '0')}`;

    const initialQuote: NewQuoteLocal = {
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
      notes: 'Gràcies pel vostre interès.',
      
      subtotal: 0, 
      discount_amount: 0, 
      tax_amount: 0, 
      total_amount: 0, 
      
      tax_rate: 0.21,
      legacy_tax_amount: null, 
      legacy_tax_rate: null, 
      retention_amount: 0,
      
      secure_id: crypto.randomUUID(),
      show_quantity: true,
      created_at: new Date().toISOString(),
      sent_at: null, 
      send_at: null, 
      rejection_reason: null, 
      theme_color: null, 
      
      // ❌ SENSE verifactu_uuid
      
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    }

    return (
      <QuoteEditorClient
        // ✅ Casting segur
        initialQuote={initialQuote as unknown as EditableQuote}
        contacts={contactsRes.data || []}
        products={productsRes.data || []}
        companyProfile={teamRes.data as Team | null}
        initialOpportunities={[]}
        userId={user.id}
        locale={locale}
      />
    )
  }

  // --- LÒGICA EXISTENT ---
  const [contactsRes, productsRes, teamRes, quoteDetailsRes] = await Promise.all([
    ...commonQueries,
    supabase.rpc('get_quote_details', { p_quote_id: Number(quoteId) }).single<QuoteDetailsResponse>(),
  ])

  if (contactsRes.error || productsRes.error || teamRes.error || quoteDetailsRes.error) {
      console.error("❌ [QuoteEditorData] Error carregant dades existents:", quoteDetailsRes.error);
      return <div>Error carregant dades de l'editor.</div>
  }

  if (!quoteDetailsRes.data?.quote) redirect(`/${locale}/finances/quotes`);

  const safeExistingQuote = {
      ...quoteDetailsRes.data.quote,
      discount_percent_input: null,
      tax_percent_input: null,
      items: quoteDetailsRes.data.quote.items || []
  };

  return (
    <QuoteEditorClient
      initialQuote={safeExistingQuote as unknown as EditableQuote}
      contacts={contactsRes.data || []}
      products={productsRes.data || []}
      companyProfile={teamRes.data as Team | null}
      initialOpportunities={quoteDetailsRes.data.opportunities || []}
      userId={user.id}
      locale={locale}
    />
  )
}