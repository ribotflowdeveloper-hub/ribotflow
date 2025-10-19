// src/app/[locale]/(app)/finances/suppliers/page.tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SuppliersData } from './_components/SuppliersData';

// Defineix el tipus explícitament per claredat, com abans
type SuppliersPageProps = {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
};

export default async function SuppliersListPage({ searchParams }: SuppliersPageProps) {
  // ✅ Llegim els valors AQUÍ, al component de pàgina
  const page = searchParams?.page ?? '1';
  const pageSize = searchParams?.pageSize ?? '10';
  const search = searchParams?.search;
  const sortBy = searchParams?.sortBy;
  const sortOrder = searchParams?.sortOrder;

  return (
    <Suspense fallback={<SuppliersListSkeleton />}>
      {/* ✅ Passem els valors individuals com a props */}
      <SuppliersData
        page={page}
        pageSize={pageSize}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
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