// src/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceDetailData.tsx
import { notFound } from 'next/navigation';
import { fetchInvoiceDetail } from '../actions'; // Acció per buscar una factura
import { InvoiceDetailClient } from './InvoiceDetailClient';
// Podries necessitar altres accions per carregar dades relacionades (ex: clients, productes)
// import { fetchActiveClients } from '@/app/[locale]/(app)/crm/contactes/actions';
// import { fetchActiveProducts } from '@/app/[locale]/(app)/crm/products/actions';
import { PageHeader } from '@/components/shared/PageHeader';
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
  // Validem i convertim a número només si NO és 'new'
  const invoiceId = isNew ? null : parseInt(invoiceIdParam, 10);

  // Validació bàsica de l'ID
  if (!isNew && (isNaN(invoiceId as number) || invoiceId === null)) {
      console.error("Invalid invoice ID:", invoiceIdParam);
      notFound();
  }

  const t = await getTranslations('InvoiceDetailPage'); // Namespace per a traduccions

  // Carreguem les dades només si estem editant una factura existent
  let invoiceData = null;
  if (!isNew && invoiceId !== null) {
    invoiceData = await fetchInvoiceDetail(invoiceId);
    // Si no trobem la factura, mostrem 404
    if (!invoiceData) {
      notFound();
    }
  }

  // TODO: Carregar dades addicionals necessàries per al formulari (ex: llista de clients, productes)
  // const clients = await fetchActiveClients(); // Exemple
  // const products = await fetchActiveProducts(); // Exemple

  const title = isNew
    ? t('createTitle')
    : t('editTitle', { number: invoiceData?.invoice_number ?? invoiceId ?? '' });
  const description = isNew ? t('createDescription') : t('editDescription');

  return (
    // Estructura opcional amb PageHeader (similar a Suppliers)
    <div className="flex flex-col gap-6">
       <PageHeader
        title={title}
        description={description}
        showBackButton={true} // El botó de tornar el gestionarà el Client
      />
      <InvoiceDetailClient
        initialData={invoiceData} // Pot ser null si isNew és true
        isNew={isNew}
        // Passa les dades addicionals carregades
        // clients={clients}
        // products={products}
      />
    </div>
  );
}