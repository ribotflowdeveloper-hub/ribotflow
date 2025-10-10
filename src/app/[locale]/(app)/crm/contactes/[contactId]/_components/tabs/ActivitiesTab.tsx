import { FC } from 'react';
import { format } from 'date-fns';
import { type Locale } from 'date-fns';
import { type Activity } from '@/types/crm';
import { EmptyState } from '@/components/shared/EmptyState';   

interface Props { activities: Activity[]; dateLocale: Locale; emptyMessage: string; }

export const ActivitiesTab: FC<Props> = ({ activities, dateLocale, emptyMessage }) => {
    if (activities.length === 0) return <EmptyState message={emptyMessage} />;

    return (
        <div className="space-y-4">
            {activities.map(act => (
                <div key={act.id} className="p-4 rounded-lg bg-background/50 border">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="font-bold text-primary">{act.type}</span>
                        <span className="text-muted-foreground">{format(new Date(act.created_at), "d MMMM yyyy, HH:mm", { locale: dateLocale })}</span>
                    </div>
                    <p className="text-foreground italic">"{act.content}"</p>
                </div>
            ))}
        </div>
    );
};