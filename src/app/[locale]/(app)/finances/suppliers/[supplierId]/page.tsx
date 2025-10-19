import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierDetailData } from './_components/SupplierDetailData';

// El tipus PageProps ja inclou params: { supplierId: string }
type SupplierDetailPageProps = {
  params: { supplierId: string };
};

// Aquest component només fa de contenidor i passa els params
export default function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  // ❌ NO ACCEDIR a params.supplierId AQUÍ ❌
  // const isNewPage = params.supplierId === 'new'; // <--- ELIMINAR AQUESTA LÍNIA
  // const t = await getTranslations...; // <--- ELIMINAR AQUESTA LÍNIA
  // const title = ...; // <--- ELIMINAR AQUESTA LÍNIA
  // const description = ...; // <--- ELIMINAR AQUESTA LÍNIA

  return (
    // Suspense envolta el component que fa la càrrega de dades
    <Suspense fallback={<SupplierDetailSkeleton />}>
      {/* Passem params directament a SupplierDetailData per complir la interfície */}
      <SupplierDetailData params={params} />
    </Suspense>
  );
}

// El Skeleton es queda igual
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