// src/app/[locale]/(app)/finances/suppliers/page.tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SuppliersData } from './_components/SuppliersData';

// El tipus de props per a la pàgina
type SuppliersPageProps = {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
};

// 'async' aquí és correcte
export default async function SuppliersListPage({ searchParams }: SuppliersPageProps) {
  
  // ⛔ NO LLEGIM els 'searchParams' aquí.

  /**
   * ✅ SOLUCIÓ DEFINITIVA:
   * 1. Passem l'objecte 'searchParams' sencer al component fill.
   * 2. Afegim una 'key' única (basada en els searchParams) a 'SuppliersData'.
   * * Això és crucial. La 'key' li diu a React que si els 'searchParams' 
   * canvien, ha de tractar 'SuppliersData' com un component completament 
   * nou. Això fa que 'Suspense' s'activi correctament i el component
   * fill ('SuppliersData') torni a executar la seva lògica 'async'
   * per anar a buscar les noves dades.
   */
  const key = JSON.stringify(searchParams);

  return (
    <Suspense fallback={<SuppliersListSkeleton />}>
      <SuppliersData key={key} searchParams={searchParams} />
    </Suspense>
  );
}

// El Skeleton es queda igual
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