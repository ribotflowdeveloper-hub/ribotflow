// src/app/[locale]/(app)/crm/calendari/_components/CalendarSkeleton.tsx
'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/utils"; // Assumim que cn està disponible

const SkeletonCard = () => (
    <Skeleton className="h-6 w-full rounded-sm mb-1 bg-gray-200 dark:bg-gray-700" />
);

export default function CalendarSkeleton() {
    // 🧠 Racional: Utilitzem una graella per simular les cel·les del calendari
    // Fons blanc forçat per consistència amb el CalendarClient.tsx
    return (
        <div className={cn("p-2 border rounded-lg bg-white shadow-md")} style={{ height: 'calc(100vh - 150px)' }}>
            
            {/* 1. Capçalera de dies de la setmana (Simulació) */}
            <div className="grid grid-cols-7 border-b text-center font-semibold text-sm h-10">
                {['Dl.', 'Dt.', 'Dc.', 'Dj.', 'Dv.', 'Ds.', 'Dg.'].map((day) => (
                    <div key={day} className="py-2 text-foreground">
                        {day}
                    </div>
                ))}
            </div>

            {/* 2. Graella de dies (Simulació del contingut del mes/setmana) */}
            {/* L'altura total es calcula per omplir l'espai restant de la pantalla */}
            <div className="grid grid-cols-7" style={{ height: 'calc(100% - 40px)' }}>
                {/* Creem 5 setmanes de simulació per omplir la vista de mes/setmana */}
                {[...Array(35)].map((_, index) => ( 
                    <div 
                        key={index} 
                        className="p-1 border-r border-b space-y-2 overflow-hidden"
                        // El 28 és l'últim dia, evitem la vora dreta
                        style={{ minHeight: '90px' }} 
                    >
                        {/* Indicador de dia */}
                        <Skeleton className="h-4 w-6 mb-2 bg-gray-200 dark:bg-gray-700" />
                        
                        {/* Fins a 3 cards de skeleton per dia */}
                        {index % 7 === 0 && <SkeletonCard />}
                        {index % 7 === 1 && <SkeletonCard />}
                        {index % 7 === 2 && <SkeletonCard />}
                        {index % 7 === 4 && <SkeletonCard />}
                        {index % 7 === 6 && <SkeletonCard />}

                        {/* Més indicadors de càrrega (opcional) */}
                        {index % 5 === 0 && <SkeletonCard />}
                    </div>
                ))}
            </div>
        </div>
    );
}