import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { type PageProps } from '@/types/shared/next-page-props';
// Més endavant, aquí anirà el component de dades:
// import { SupplierDetailData } from './_components/SupplierDetailData';

type SupplierDetailPageProps = PageProps;

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const isNew = params.supplierId === 'new';
  const t = await getTranslations('SupplierDetailPage'); // Hauràs d'afegir traduccions

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isNew ? t('createTitle') : t('editTitle')}
        description={isNew ? t('createDescription') : t('editDescription')}
        showBackButton={true}
      />

      <Suspense fallback={<SupplierDetailSkeleton />}>
        {/* <SupplierDetailData supplierId={isNew ? null : params.supplierId} /> */}

        {/* De moment, mostrem un placeholder */}
        <p className="p-4 bg-card rounded-lg border">
            {isNew ? t('loadingCreate') : `${t('loadingEdit')} ${params.supplierId}`}
        </p>
      </Suspense>
    </div>
  );
}

// Un Skeleton bàsic per al formulari
function SupplierDetailSkeleton() {
    return (
        <div className="space-y-6 p-4 bg-card rounded-lg border">
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-10 w-1/2" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-10 w-1/2" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-10 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24" />
        </div>
    )
}