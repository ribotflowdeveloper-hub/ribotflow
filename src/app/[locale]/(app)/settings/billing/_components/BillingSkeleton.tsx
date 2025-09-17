/**
 * @file BillingSkeleton.tsx
 * @summary Muestra un esqueleto de carga para la página de Facturación y Planes.
 */
"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const BillingSkeleton: React.FC = () => (
  <div className="space-y-12 animate-pulse">
    <div className="space-y-2">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-5 w-2/3" />
    </div>
    <div className="flex items-center justify-center space-x-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-12 rounded-full" />
      <Skeleton className="h-5 w-40" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  </div>
);