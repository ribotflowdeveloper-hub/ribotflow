/**
 * @file NetworkSkeleton.tsx
 * @summary Muestra un esqueleto de carga para la página de Network.
 */
"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const NetworkSkeleton: React.FC = () => (
  <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
    {/* Esqueleto para la lista de perfiles */}
    <div className="lg:col-span-1 h-full flex flex-col glass-effect rounded-lg p-4 space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    {/* Esqueleto para el mapa */}
    <div className="lg:col-span-2 h-full rounded-lg overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  </div>
);