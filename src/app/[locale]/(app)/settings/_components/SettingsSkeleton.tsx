/**
 * @file SettingsSkeleton.tsx
 * @summary Esquelet de càrrega per a l'estructura general de la secció de Configuració.
 */
"use client";

import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full animate-pulse">
      {/* Esquelet per a la navegació lateral */}
      <aside className="flex-shrink-0 lg:w-64">
        <Skeleton className="h-9 w-1/2 mb-8" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </aside>
      {/* Esquelet per a l'àrea de contingut */}
      <main className="flex-1">
        <div className="space-y-4">
          <Skeleton className="h-9 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-64 w-full mt-8" />
        </div>
      </main>
    </div>
  );
}