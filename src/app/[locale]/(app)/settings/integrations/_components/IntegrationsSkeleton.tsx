/**
 * @file IntegrationsSkeleton.tsx
 * @summary Mostra un esquelet de càrrega per a la pàgina d'Integracions.
 */
"use client";

import { Skeleton } from '@/components/ui/skeleton';

export function IntegrationsSkeleton() {
  return (
    <div>
      {/* Esquelet per a la capçalera */}
      <Skeleton className="h-9 w-1/2 mb-8" />
      
      {/* Esquelet per a la targeta d'integracions */}
      <div className="glass-card p-8 space-y-4 animate-pulse">
        <Skeleton className="h-7 w-1/3 mb-4" />
        {/* Esquelet per a la línia de Google */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {/* Esquelet per a la línia de Microsoft */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}