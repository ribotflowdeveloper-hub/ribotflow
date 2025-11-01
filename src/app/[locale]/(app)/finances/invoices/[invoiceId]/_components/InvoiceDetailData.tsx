// /app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceDetailData.tsx (COMPLET I CORREGIT)
import { notFound } from 'next/navigation'
import { fetchInvoiceDetail } from '../_hooks/fetchInvoiceDetail'
import { InvoiceDetailClient } from './InvoiceDetailClient'
import { getTranslations } from 'next-intl/server'

import { validateUserSession } from '@/lib/supabase/session'
import { type CompanyProfile } from '@/types/settings/team'
import { type Database } from '@/types/supabase'

// ✅ Definim tipus de la Base de Dades
type Contact = Database['public']['Tables']['contacts']['Row']

interface InvoiceDetailDataProps {
  invoiceId: string
}

export async function InvoiceDetailData({
  invoiceId: invoiceIdProp,
}: InvoiceDetailDataProps) {
  const t = await getTranslations('InvoiceDetailPage')
  const isNew = invoiceIdProp === 'new'

  const session = await validateUserSession()
  if ('error' in session) {
    notFound()
  }
  // ✅ Necessitem 'user' i 'activeTeamId'
  const { supabase, user, activeTeamId } = session

  // --- Càrregues Comunes (per a 'new' i 'edit') ---
  const [contactsRes, productsRes] = await Promise.all([
    supabase
      .from('contacts')
      // ✅✅✅ CANVI AQUÍ: De 'select("id, nom...")' a 'select("*")'
      .select('*')
      // ✅✅✅
      .eq('team_id', activeTeamId)
      .order('nom', { ascending: true }),
    supabase
      .from('products')
      .select('*')
      .eq('team_id', activeTeamId)
      .eq('is_active', true)
  ])

  if (contactsRes.error) {
    console.error('Error carregant contactes:', contactsRes.error.message)
    // No fem notFound(), podem continuar amb llistes buides
  }
  if (productsRes.error) {
    console.error('Error carregant productes:', productsRes.error.message)
  }

  const contacts = contactsRes.data || []
  const products = productsRes.data || [] // ✅ AFEGIT: Llista de productes

  // --- Lògica per a una nova factura ---
  if (isNew) {
    // Carreguem només les dades de l'empresa
    const { data: company } = await supabase
      .from('teams')
      .select(
        `
        id, 
        company_name: name,
        company_tax_id: tax_id,
        company_address: address,
        company_email: email,
        company_phone: phone,
        logo_url
      `,
      )
      .eq('id', activeTeamId)
      .single<CompanyProfile>()

    return (
      <InvoiceDetailClient
        initialData={null}
        company={company || null}
        contact={null}
        contacts={contacts} // Llista de tots els contactes
        products={products} // ✅ AFEGIT: Llista de productes
        userId={user.id} // ✅ AFEGIT: ID de l'usuari
        teamId={activeTeamId} // ✅ AFEGIT: ID de l'equip
        isNew={true}
        title={t('createTitle')}
        description={t('createDescription')}
      />
    )
  }

  // --- Lògica de càrrega per a una factura existent ---

  const numericInvoiceId = parseInt(invoiceIdProp, 10)
  if (isNaN(numericInvoiceId)) {
    console.error('Invalid invoice ID:', invoiceIdProp)
    notFound()
  }

  // 1. Carregar la factura i el perfil de l'empresa (Emissor) en paral·lel
  const [invoiceData, companyRes] = await Promise.all([
    fetchInvoiceDetail(numericInvoiceId),
    supabase
      .from('teams')
      .select(
        `
        id,
        company_name: name,
        company_tax_id: tax_id,
        company_address: address,
        company_email: email,
        company_phone: phone,
        logo_url
      `,
      )
      .eq('id', activeTeamId)
      .single<CompanyProfile>(),
  ])

  // Validem la factura
  if (!invoiceData || invoiceData.team_id !== activeTeamId) {
    notFound()
  }

  // Validem l'empresa
  if (companyRes.error || !companyRes.data) {
    console.error(
      "Error carregant el perfil de l'empresa:",
      companyRes.error?.message || 'Perfil no trobat',
    )
    notFound()
  }
  const company = companyRes.data;

  // 3. Carregar el contacte (Receptor)
  let contact: Contact | null = null
  if (invoiceData.contact_id) {
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', invoiceData.contact_id)
      .eq('team_id', activeTeamId)
      .single<Contact>()
    contact = contactData
  }

  // Calculem títol i descripció
  const title = t('editTitle', {
    number: invoiceData?.invoice_number ?? invoiceIdProp,
  })
  const description = t('editDescription')

  return (
    <InvoiceDetailClient
      initialData={invoiceData}
      company={company}
      contact={contact}
      contacts={contacts} // Llista de tots els contactes
      products={products} // ✅ AFEGIT: Llista de productes
      userId={user.id} // ✅ AFEGIT: ID de l'usuari
      teamId={activeTeamId} // ✅ AFEGIT: ID de l'equip
      isNew={isNew}
      title={title}
      description={description}
    />
  )
}