import { notFound } from 'next/navigation'
import { fetchInvoiceDetail } from '../_hooks/fetchInvoiceDetail'
import { InvoiceDetailClient } from './InvoiceDetailClient'
import { getTranslations } from 'next-intl/server'

import { validateUserSession } from '@/lib/supabase/session'
import { type CompanyProfile } from '@/types/settings/team'
import { type Contact } from '@/types/crm/contacts'

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

  // --- Lògica per a una nova factura ---
  if (isNew) {
    // ✅ **CORRECCIÓ (1/2)**: Taula 'teams' i filtre per 'id'
    const { data: company } = await supabase
      .from('teams') // 👈 TAULA CORRECTA
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
      .eq('id', activeTeamId) // 👈 FILTRE CORRECTE
      .single<CompanyProfile>()

    return (
      <InvoiceDetailClient
        initialData={null}
        company={company || null}
        contact={null}
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
  // ✅ **CORRECCIÓ (2/2)**: Taula 'teams' i filtre per 'id'
  const { data: company, error: companyError } = await supabase
    .from('teams') // 👈 TAULA CORRECTA
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
    .eq('id', activeTeamId) // 👈 FILTRE CORRECTE
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
      .from('contacts') // Aquesta taula ja la teníem bé
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
      isNew={isNew}
      title={title}
      description={description}
    />
  )
}