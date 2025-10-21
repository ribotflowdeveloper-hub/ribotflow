// src/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceDetailData.tsx
import { notFound } from 'next/navigation';
import { fetchInvoiceDetail } from '../actions'; // Acció per buscar una factura
import { InvoiceDetailClient } from './InvoiceDetailClient';
// Podries necessitar altres accions per carregar dades relacionades (ex: clients, productes)
// import { fetchActiveClients } from '@/app/[locale]/(app)/crm/contactes/actions';
// import { fetchActiveProducts } from '@/app/[locale]/(app)/crm/products/actions';
import { getTranslations } from 'next-intl/server';

// ISP: Rep només els paràmetres que necessita (invoiceId)
interface InvoiceDetailDataProps {
  params: { invoiceId: string };
}

// SRP: Responsable de carregar les dades inicials per al detall.
// DIP: Depèn de fetchInvoiceDetail i InvoiceDetailClient.
export async function InvoiceDetailData({ params }: InvoiceDetailDataProps) {
  const invoiceIdParam = params.invoiceId;
  const isNew = invoiceIdParam === 'new';
  const invoiceId = isNew ? null : parseInt(invoiceIdParam, 10);

  if (!isNew && (isNaN(invoiceId as number) || invoiceId === null)) {
    console.error("Invalid invoice ID:", invoiceIdParam);
    notFound();
  }

  const t = await getTranslations('InvoiceDetailPage');

  let invoiceData = null;
  if (!isNew && invoiceId !== null) {
    invoiceData = await fetchInvoiceDetail(invoiceId);
    if (!invoiceData) {
      notFound();
    }
  }

  // TODO: Carregar dades addicionals (clients, products, projects...)
  // const clients = await fetchActiveClients();
  // const products = await fetchActiveProducts();
  // const projects = await fetchProjects(); // Exemple

  // ✅ Calculem títol i descripció per passar-los al client
  const title = isNew
    ? t('createTitle')
    : t('editTitle', { number: invoiceData?.invoice_number ?? invoiceId ?? '' });
  const description = isNew ? t('createDescription') : t('editDescription');

  return (
    // ❗ Eliminem el PageHeader i el div contenidor si ja no és necessari
    // <div className="flex flex-col gap-6">
    //    <PageHeader ... />
        <InvoiceDetailClient
            initialData={invoiceData}
            isNew={isNew}
            title={title} // ✅ Passem title com a prop
            description={description} // ✅ Passem description com a prop
            // Passa les dades addicionals carregades
            // clients={clients}
            // products={products}
            // projects={projects}
        />
    // </div>
  );
}