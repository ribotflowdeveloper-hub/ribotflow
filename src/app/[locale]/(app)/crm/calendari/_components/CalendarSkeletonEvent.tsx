// src/app/[locale]/(app)/crm/calendari/_components/CalendarSkeletonEvent.tsx
'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { EventProps } from "react-big-calendar";
import { CalendarEvent } from "@/types/crm";
import { cn } from "@/lib/utils/utils"; 
import * as React from "react";


// 🧠 Racional: Aquest component simula la "targeta" d'una tasca/quote,
// utilitzant un color neutral i animació de Skeleton.
export default function CalendarSkeletonEvent({ event }: EventProps<CalendarEvent>) {
    // Si és un esdeveniment d'un dia sencer (month/week view), simulem la card de tasca
    if (event.allDay) {
        // Utilitzem un ampli de classe per simular diferents tipus de tasques
        const widthClass = event.id === 'skeleton-1' ? "w-full" : "w-11/12";
        const heightClass = event.id === 'skeleton-2' ? "h-5" : "h-6";
        
        // El padding-x de 0.5 és important per l'estil de react-big-calendar
        return (
            <div className="flex items-center space-x-1 p-0.5" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <Skeleton className={cn(heightClass, widthClass, "rounded-sm bg-gray-200 dark:bg-gray-700")} />
            </div>
        );
    }
    
    // Per a la vista de dia/agenda (amb hora), podem fer-lo més llarg
    return (
        <div className="absolute inset-0 p-1">
            <Skeleton className="h-full w-full rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
    );
}