"use client";

import { cn } from "@/lib/utils/utils";

/**
 * @summary Mostra un esquelet de càrrega que imita el disseny final del Dashboard (4+2).
 */
export function DashboardSkeleton() {
  // Component intern per a reutilitzar la targeta de càrrega
  const SkeletonCard = ({ className, children }: { className?: string, children?: React.ReactNode }) => (
    <div className={cn("rounded-xl border bg-card shadow-lg overflow-hidden", className)}>
      <div className="h-14 p-4 bg-muted animate-pulse" />
      <div className="p-6">{children}</div>
    </div>
  );

  // Component intern per a les línies de text
  const SkeletonLine = ({ className }: { className?: string }) => (
    <div className={cn("h-4 bg-muted rounded-md animate-pulse", className)} />
  );

  return (
    <div className="relative w-full p-4 lg:p-6">
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(theme(colors.gray.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.slate.800)_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="flex flex-col gap-6">
        
        {/* --- FILA SUPERIOR: ESQUELET DE LES 4 TARGETES D'INFORMACIÓ --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Esquelet per a Pressupostos / Safata / Activitats / Radar */}
          <SkeletonCard className="h-96">
            <div className="space-y-3">
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
            </div>
          </SkeletonCard>
          <SkeletonCard className="h-96">
            <div className="space-y-3">
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
            </div>
          </SkeletonCard>
          <SkeletonCard className="h-96">
            <div className="space-y-3">
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
            </div>
          </SkeletonCard>
          <SkeletonCard className="h-96">
            <div className="space-y-3">
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
              <SkeletonLine className="h-10 w-full" />
            </div>
          </SkeletonCard>

        </div>

        {/* --- FILA INFERIOR: ESQUELET DE LES 2 TARGETES DE TREBALL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Esquelet per a SalesPerformance */}
          <div className="lg:col-span-2">
            <SkeletonCard>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-20 col-span-1 bg-muted rounded-lg"></div>
                    <div className="h-20 col-span-2 bg-muted rounded-lg"></div>
                </div>
                <SkeletonLine className="w-full h-3" />
              </div>
            </SkeletonCard>
          </div>

          {/* Esquelet per a l'Agenda */}
          <div className="lg:col-span-3">
            <SkeletonCard>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <SkeletonLine className="w-1/3 h-8" />
                  <SkeletonLine className="w-1/3 h-8" />
                  <SkeletonLine className="w-1/3 h-8" />
                </div>
                <SkeletonLine className="h-8" />
                <div className="pt-4 space-y-3">
                  <SkeletonLine className="h-12" />
                  <SkeletonLine className="h-12" />
                  <SkeletonLine className="h-12" />
                </div>
              </div>
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}