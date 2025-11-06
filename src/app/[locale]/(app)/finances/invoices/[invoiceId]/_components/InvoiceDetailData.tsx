import { notFound } from 'next/navigation'
import { fetchInvoiceDetail } from '../_hooks/fetchInvoiceDetail'
import { InvoiceDetailClient } from './InvoiceDetailClient'
import { getTranslations } from 'next-intl/server'

import { 
  validateActionAndUsage, 
  validateSessionAndPermission 
} from '@/lib/permissions/permissions' // Assegura't que la ruta és correcta
import { PERMISSIONS } from '@/lib/permissions/permissions.config'
import { type PlanLimit } from '@/config/subscriptions'
// Assegura't que aquest component existeix i la ruta és correcta
import { AccessDenied } from '@/components/shared/AccessDenied' 

import { type Contact } from '@/types/db' 
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

  // --- Lògica per a una nova factura ---
  if (isNew) {
    // CAPA 2: Validació de CREACIÓ (Permís + Límit)
    const limitToCheck: PlanLimit = 'maxInvoicesPerMonth';
    const validation = await validateActionAndUsage(
      PERMISSIONS.MANAGE_INVOICES,
      limitToCheck
    );

    if ('error' in validation) {
      console.warn(`[InvoiceDetailData] Bloquejada creació de factura: ${validation.error.message}`);
      return (
        <AccessDenied 
          title={t('errors.limitReachedTitle') || 'Límit assolit'}
          message={validation.error.message}
          backUrl="/settings/billing"
        />
      )
    }

    const { supabase, user, activeTeamId } = validation;
    
    // Càrregues Comunes per 'new'
    const [contacts, products, company] = await Promise.all([
      getActiveContacts(supabase, activeTeamId),
      getActiveProducts(supabase, activeTeamId),
      getCompanyProfile(supabase, activeTeamId)
    ]);

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
  
  // CAPA 2: Validació d'EDICIÓ (Només permís)
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_INVOICES);

  if ('error' in validation) {
    console.warn(`[InvoiceDetailData] Bloquejada edició de factura: ${validation.error.message}`);
    notFound();
  }
  
  const { supabase, user, activeTeamId } = validation;

  const numericInvoiceId = parseInt(invoiceIdProp, 10)
  if (isNaN(numericInvoiceId)) {
    console.error('Invalid invoice ID:', invoiceIdProp)
    notFound()
  }

  // ✅ CORRECCIÓ: Carreguem TOTES les dades necessàries per 'edit'
  const [invoiceData, company, contacts, products] = await Promise.all([
    fetchInvoiceDetail(numericInvoiceId),
    getCompanyProfile(supabase, activeTeamId),
    getActiveContacts(supabase, activeTeamId), // <-- Faltava
    getActiveProducts(supabase, activeTeamId)  // <-- Faltava
  ])

  // Validem la factura
  if (!invoiceData || invoiceData.team_id !== activeTeamId) {
    notFound()
  }

  // Validem l'empresa
  if (!company) {
    console.error("Error carregant el perfil de l'empresa")
    notFound()
  }

  // Obtenim el contacte
  let contact: Contact | null = null
  if (invoiceData.contact_id) {
    contact = await getContactById(supabase, activeTeamId, invoiceData.contact_id)
  }

  const title = t('editTitle', {
    number: invoiceData?.invoice_number ?? invoiceIdProp,
  })
  const description = t('editDescription')

  return (
    <InvoiceDetailClient
      initialData={invoiceData}
      company={company}
      contact={contact}
      contacts={contacts} // ✅ Ara sí que existeix
      products={products} // ✅ Ara sí que existeix
      userId={user.id} 
      teamId={activeTeamId}
      isNew={isNew}
      title={title}
      description={description}
    />
  )
}