// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/ActivitiesTab.tsx (Refactoritzat)

import { FC } from 'react';
import { format } from 'date-fns';
import { type Locale } from 'date-fns';
import { EmptyState } from '@/components/shared/EmptyState';
// ✅ 1. Importem la definició de la base de dades.
import { type Database } from '@/types/supabase';

// ✅ 2. Definim el tipus 'Activity' a partir de la taula corresponent.
type Activity = Database['public']['Tables']['activities']['Row'];

interface Props {
    activities: Activity[];
    dateLocale: Locale;
    emptyMessage: string;
}

export const ActivitiesTab: FC<Props> = ({ activities, dateLocale, emptyMessage }) => {
    if (activities.length === 0) return <EmptyState message={emptyMessage} />;

    return (
        <div className="space-y-4">
            {activities.map(act => (
                <div key={act.id} className="p-4 rounded-lg bg-background/50 border">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="font-bold text-primary">{act.type}</span>
                        {/* ✅ 3. Afegim una comprovació per si 'created_at' és nul. */}
                        <span className="text-muted-foreground">
                            {act.created_at ? format(new Date(act.created_at), "d MMMM yyyy, HH:mm", { locale: dateLocale }) : ''}
                        </span>
                    </div>
                    <p className="text-foreground italic">"{act.content}"</p>
                </div>
            ))}
        </div>
    );
};