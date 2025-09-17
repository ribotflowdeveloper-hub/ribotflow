"use client";

import React, { FC } from 'react';

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina del Dashboard General del CRM.
 * Aquesta UI es mostra a l'instant gràcies a React Suspense.
 */
export const CrmSkeleton: FC = () => (
    <div className="space-y-8 animate-pulse">
        {/* Esquelet per a les targetes de KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[150px] bg-white/5 rounded-2xl"></div>
            ))}
        </div>
        
        {/* Esquelet per a l'embut de vendes i les llistes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[300px] bg-white/5 rounded-2xl"></div>
            <div className="space-y-8">
                <div className="h-[150px] bg-white/5 rounded-2xl"></div>
                <div className="h-[150px] bg-white/5 rounded-2xl"></div>
            </div>
        </div>

        {/* Esquelet per a les Estadístiques Clau */}
        <div className="h-[200px] bg-white/5 rounded-2xl"></div>
    </div>
);