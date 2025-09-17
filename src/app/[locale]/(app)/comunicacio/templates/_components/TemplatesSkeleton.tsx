/**
 * @file TemplatesSkeleton.tsx
 * @summary Muestra un esqueleto de carga para la página de Plantillas.
 */
"use client";

import React from 'react';

export const TemplatesSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {/* Esqueleto para la cabecera */}
        <div className="flex justify-between items-center">
            <div className="h-9 bg-muted rounded-lg w-1/3"></div>
            <div className="h-10 bg-muted rounded-lg w-36"></div>
        </div>

        {/* Esqueleto para las 3 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 min-h-0 h-[calc(100vh-12rem)]">
            <div className="h-full bg-muted rounded-xl"></div>
            <div className="h-full bg-muted rounded-xl"></div>
            <div className="h-full bg-muted rounded-xl"></div>
        </div>
    </div>
);