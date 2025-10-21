import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierDetailData } from './_components/SupplierDetailData';

// ✅ Definim la interfície localment amb 'params' com a Promise.
interface SupplierDetailPageProps {
  params: Promise<{
    locale: string;
    supplierId: string;
  }>;
}

/**
 * Component de pàgina per al detall d'un proveïdor.
 */
export default async function SupplierDetailPage(props: SupplierDetailPageProps) {
  
  // ✅ Resolem la promesa per obtenir l'ID del proveïdor.
  const { supplierId } = await props.params;

  return (
    <Suspense fallback={<SupplierDetailSkeleton />}>
      {/* ✅ Simplifiquem: Passem només l'string 'supplierId' com a prop. */}
      <SupplierDetailData key={supplierId} supplierId={supplierId} />
    </Suspense>
  );
}

// El Skeleton es queda igual, no cal tocar-lo.
function SupplierDetailSkeleton() {
  return (
    <div className="space-y-6 p-4 bg-card rounded-lg border">
      <div className="space-y-2"><Skeleton className="h-4 w-1/6" /><Skeleton className="h-10 w-1/2" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-1/6" /><Skeleton className="h-10 w-1/2" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-1/6" /><Skeleton className="h-10 w-1/3" /></div>
      <Skeleton className="h-10 w-24" />
    </div>
  )
}