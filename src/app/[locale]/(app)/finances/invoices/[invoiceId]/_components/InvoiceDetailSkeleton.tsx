// src/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceDetailSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function InvoiceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Skeleton del PageHeader */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" /> {/* Botó Desa */}
      </div>

      {/* Skeleton del Formulari (Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Esquerra */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
        {/* Columna Dreta */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
             <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
             <CardContent className="space-y-4">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
             </CardContent>
          </Card>
           <Card>
             <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
             <CardContent>
               <Skeleton className="h-20 w-full" />
             </CardContent>
          </Card>
          <Card>
             <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
             <CardContent className="space-y-2">
               <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-8 w-full mt-4 border-t pt-2" />
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}