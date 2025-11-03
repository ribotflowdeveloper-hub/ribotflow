// Ubicació: /app/(app)/comunicacio/marketing/_components/MetricCard.tsx
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card'; // ✅ Usem Card per semàntica

interface MetricCardProps {
    title: string;
    value: string | number;
    // ✅ CANVI: Passem el component icona, no un node renderitzat.
    // Això ens dóna control sobre els seus estils (color, mida) dins de la targeta.
    icon: React.ElementType; 
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon }) => (
    // ✅ CANVI: Eliminem 'glass-effect' i fem servir 'Card' de shadcn.
    // 'bg-card' i 'border' s'adapten automàticament al tema.
    <Card className="flex-1">
        <CardContent className="p-6">
            <div className="flex items-center gap-4">
                {/* ✅ CANVI: Fons i color de text semàntics.
                    - Mode Clar: bg-primary/10 (ex: lila molt clar), text-primary (ex: lila fosc)
                    - Mode Fosc: bg-primary/20 (ex: lila fosc tènue), text-primary (ex: lila clar)
                */}
                <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                    {/* ✅ CANVI: Usem 'text-muted-foreground' per al títol.
                        - Mode Clar: Gris fosc
                        - Mode Fosc: Gris clar
                    */}
                    <p className="text-muted-foreground text-sm">{title}</p>
                    {/* ✅ CANVI: Usem 'text-foreground' per al valor.
                        - Mode Clar: Negre/Gris molt fosc
                        - Mode Fosc: Blanc/Gris molt clar
                    */}
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);