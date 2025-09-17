/**
 * @file ExpensesSkeleton.tsx
 * @summary Muestra un esqueleto de carga para la página de Gastos.
 */
"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ExpensesSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        {/* Esqueleto para la cabecera */}
        <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-10 w-36" />
        </div>
        {/* Esqueleto para la tabla */}
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    </div>
);