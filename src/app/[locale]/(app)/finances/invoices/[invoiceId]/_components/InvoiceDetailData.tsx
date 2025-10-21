import { notFound } from 'next/navigation';
import { fetchInvoiceDetail } from '../actions';
import { InvoiceDetailClient } from './InvoiceDetailClient';
import { getTranslations } from 'next-intl/server';

// ✅ ISP: Rep només la prop que necessita: l'ID com a string.
interface InvoiceDetailDataProps {
  invoiceId: string;
}

/**
 * Component responsable de carregar les dades de la factura.
 */
export async function InvoiceDetailData({ invoiceId: invoiceIdProp }: InvoiceDetailDataProps) {
  // ✅ Renombrem la prop a l'entrada ('invoiceIdProp') per evitar conflictes de nom.
  
  const isNew = invoiceIdProp === 'new';

  let invoiceData = null;

  // Lògica de càrrega només si NO és una nova factura.
  if (!isNew) {
    const numericInvoiceId = parseInt(invoiceIdProp, 10);

    // Validació segura de l'ID numèric.
    if (isNaN(numericInvoiceId)) {
      console.error("Invalid invoice ID:", invoiceIdProp);
      notFound();
    }

    invoiceData = await fetchInvoiceDetail(numericInvoiceId);

    if (!invoiceData) {
      notFound();
    }
  }

  const t = await getTranslations('InvoiceDetailPage');

  // Calculem títol i descripció per passar-los al client.
  const title = isNew
    ? t('createTitle')
    : t('editTitle', { number: invoiceData?.invoice_number ?? invoiceIdProp });
  const description = isNew ? t('createDescription') : t('editDescription');

  return (
    <InvoiceDetailClient
      initialData={invoiceData}
      isNew={isNew}
      title={title}
      description={description}
      // Passa altres dades necessàries aquí...
    />
  );
}