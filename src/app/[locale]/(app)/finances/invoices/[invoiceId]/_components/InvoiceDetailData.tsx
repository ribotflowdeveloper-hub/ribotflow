// /app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceDetailData.tsx (COMPLET I REFACTORITZAT)
import { notFound } from 'next/navigation'
import { fetchInvoiceDetail } from '../_hooks/fetchInvoiceDetail'
import { InvoiceDetailClient } from './InvoiceDetailClient'
import { getTranslations } from 'next-intl/server'
import { validateUserSession } from '@/lib/supabase/session'

// ✅ Importem els tipus de DB
import { type Contact } from '@/types/db' 

// ✅ PAS 1: Importem els NOUS SERVEIS
import { getActiveContacts, getContactById } from '@/lib/services/crm/contacts/contacts.service'
import { getActiveProducts } from '@/lib/services/finances/products/products.service'
import { getCompanyProfile } from '@/lib/services/settings/team/team.service'

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
  const { supabase, user, activeTeamId } = session

  // --- Càrregues Comunes (per a 'new' i 'edit') ---
  // ✅ PAS 2: Cridem als serveis en lloc de crides directes
  const [contacts, products] = await Promise.all([
    getActiveContacts(supabase, activeTeamId),
    getActiveProducts(supabase, activeTeamId)
  ])
  
  // --- Lògica per a una nova factura ---
  if (isNew) {
    // ✅ PAS 3: Cridem al servei
    const company = await getCompanyProfile(supabase, activeTeamId)

    return (
      <InvoiceDetailClient
        initialData={null}
        company={company || null}
        contact={null}
        contacts={contacts}
        products={products}
        userId={user.id}
        teamId={activeTeamId}
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

  // ✅ PAS 4: Cridem als serveis en paral·lel
  const [invoiceData, company] = await Promise.all([
    fetchInvoiceDetail(numericInvoiceId), // Aquest ja era un hook/fetcher, està bé
    getCompanyProfile(supabase, activeTeamId),
  ])

  // Validem la factura
  if (!invoiceData || invoiceData.team_id !== activeTeamId) {
    notFound()
  }

  // Validem l'empresa
  if (!company) {
    console.error("Error carregant el perfil de l'empresa")
    // Podem fer notFound() o continuar amb 'null' si el client ho gestiona
    notFound()
  }

  // ✅ PAS 5: Cridem al servei per obtenir el contacte
  let contact: Contact | null = null
  if (invoiceData.contact_id) {
    contact = await getContactById(supabase, activeTeamId, invoiceData.contact_id)
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
      products={products} // Llista de productes
      userId={user.id} 
      teamId={activeTeamId}
      isNew={isNew}
      title={title}
      description={description}
    />
  )
}