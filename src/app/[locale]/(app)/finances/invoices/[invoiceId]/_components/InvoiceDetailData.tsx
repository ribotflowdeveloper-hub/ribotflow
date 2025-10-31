import { notFound } from 'next/navigation'
import { fetchInvoiceDetail } from '../_hooks/fetchInvoiceDetail'
import { InvoiceDetailClient } from './InvoiceDetailClient'
import { getTranslations } from 'next-intl/server'

import { validateUserSession } from '@/lib/supabase/session'
import { type CompanyProfile } from '@/types/settings/team'
// ❌ Eliminem la importació incorrecta
// import { type Contact } from '@/types/crm/contacts' 
import { type Database } from '@/types/supabase' // ✅ 1. Importem el tipus base de Supabase

// ✅ 2. Definim el tipus 'Contact' correcte basat en la BD
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
  const { supabase, activeTeamId } = session

  // ✅ 3. Carreguem la llista de TOTS els contactes (per al selector)
  //    Aquesta consulta es fa sempre, tant per 'new' com per 'edit'.
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*') // Podries seleccionar només 'id, nom, email, telefon'
    .eq('team_id', activeTeamId)
    .order('nom', { ascending: true })

  if (contactsError) {
    console.error('Error carregant contactes:', contactsError.message)
    // No fem notFound(), podem continuar amb una llista buida
  }

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
        contacts={contacts || []} // ✅ 4. Passem la llista de contactes
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

  // 1. Carregar la factura
  const invoiceData = await fetchInvoiceDetail(numericInvoiceId)
  if (!invoiceData) {
    notFound()
  }

  if (invoiceData.team_id !== activeTeamId) {
    notFound()
  }

  // 2. Carregar el perfil de l'empresa (Emissor)
  const { data: company, error: companyError } = await supabase
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

  if (companyError || !company) {
    console.error(
      "Error carregant el perfil de l'empresa:",
      companyError?.message || 'Perfil no trobat',
    )
    notFound()
  }

  // 3. Carregar el contacte (Receptor)
  let contact: Contact | null = null
  if (invoiceData.contact_id) {
    const { data: contactData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', invoiceData.contact_id)
      .eq('team_id', activeTeamId)
      .single<Contact>() // ✅ 5. Aquest tipus 'Contact' ara és el correcte (id: number)
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
      contact={contact} // ✅ 6. Aquest 'contact' ara té id: number
      contacts={contacts || []} // ✅ 7. Passem la llista de contactes
      isNew={isNew}
      title={title}
      description={description}
    />
  )
}