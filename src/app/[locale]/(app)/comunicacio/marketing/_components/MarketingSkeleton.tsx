"use client";

import React from 'react';

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina de Màrqueting.
 */
export const MarketingSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        {/* Esquelet per a la capçalera */}
        <div className="flex justify-between items-center">
            <div className="h-9 bg-muted rounded-lg w-1/3"></div>
            <div className="h-10 bg-muted rounded-lg w-1/4"></div>
        </div>

        {/* Esquelet per a les targetes de KPI */}
        <div className="flex flex-col md:flex-row gap-6">
            <div className="h-24 bg-muted rounded-xl flex-1"></div>
            <div className="h-24 bg-muted rounded-xl flex-1"></div>
            <div className="h-24 bg-muted rounded-xl flex-1"></div>
        </div>

        {/* Esquelet per a la llista de campanyes */}
        <div className="flex justify-between items-center mt-8">
            <div className="h-8 bg-muted rounded-lg w-1/4"></div>
            <div className="flex gap-2">
                <div className="h-10 w-10 bg-muted rounded-lg"></div>
                <div className="h-10 w-10 bg-muted rounded-lg"></div>
            </div>
        </div>
        <div className="h-64 bg-muted rounded-xl"></div>
    </div>
);