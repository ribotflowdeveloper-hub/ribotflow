import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SuppliersData } from './_components/SuppliersData';
import { z } from 'zod'; // Recomanat per a validació

// (Opcional però recomanat) Zod schema per validar els paràmetres
const searchParamsSchema = z.object({
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

// -------------------------------------------------------------------
// ✅ CORRECCIÓ: Definim el tipus de les props amb 'searchParams' com a Promise
// -------------------------------------------------------------------
interface SuppliersPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

/**
 * Component de pàgina per a la llista de proveïdors.
 */
export default async function SuppliersListPage(props: SuppliersPageProps) {
  
  // ✅ Resolem la promesa per obtenir els paràmetres de cerca
  const resolvedSearchParams = await props.searchParams;

  // ✅ (Recomanat) Validem els paràmetres amb Zod
  const validatedSearchParams = searchParamsSchema.parse(resolvedSearchParams);
  
  // La 'key' única és crucial per al bon funcionament de Suspense
  const suspenseKey = JSON.stringify(validatedSearchParams);

  return (
    <Suspense fallback={<SuppliersListSkeleton />}>
      {/* Passem l'objecte de paràmetres sencer, ja resolt i validat */}
      <SuppliersData key={suspenseKey} searchParams={validatedSearchParams} />
    </Suspense>
  );
}

// El Skeleton es queda igual, no cal fer-hi canvis
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