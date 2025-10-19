import { Suspense } from 'react';
// ✅ CORRECCIÓ: Imports separats. 'Card' i 'Skeleton' són components diferents.
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SuppliersData } from './_components/SuppliersData';

// ✅ CORRECCIÓ: Tipem correctament els searchParams,
// seguint el patró que fas servir a expenses/page.tsx
type SuppliersPageProps = {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
};

// La pàgina rep 'searchParams' i els passa a SuppliersData
export default async function SuppliersListPage({ searchParams }: SuppliersPageProps) {
  return (
    <Suspense fallback={<SuppliersListSkeleton />}>
      {/* ✅ Passem els searchParams al component de dades */}
      <SuppliersData searchParams={searchParams} />
    </Suspense>
  );
}

// El Skeleton es queda igual (ara funcionarà perquè els imports són correctes)
function SuppliersListSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            {/* Skeleton del PageHeader */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Skeleton de la Taula */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}