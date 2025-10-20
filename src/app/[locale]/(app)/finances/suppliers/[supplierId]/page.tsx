import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierDetailData } from './_components/SupplierDetailData';

type SupplierDetailPageProps = {
  params: { supplierId: string };
};

// Mantenim 'async'
export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  return (
    <Suspense fallback={<SupplierDetailSkeleton />}>
      {/* ✅ SOLUCIÓ DEFINITIVA: 
        1. Passem els 'params' com a prop.
        2. Afegim una 'key' única basada en el 'supplierId'. 
        
        Això força React a recrear el component 'SupplierDetailData' 
        si l'ID canvia (p.ex. navegant de 'new' a un ID), 
        la qual cosa fa que 'Suspense' i la lectura de 'params' 
        dins del fill funcionin correctament.
      */}
      <SupplierDetailData key={params.supplierId} params={params} />
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