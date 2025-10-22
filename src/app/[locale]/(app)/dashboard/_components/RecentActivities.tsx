// src/app/[locale]/(app)/dashboard/_components/RecentActivities.tsx

"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { ActivityItem } from '@/components/shared/ActivityItem';
import { ServerActivityItem, ServerActivityIcon, ServerActivityVariant } from '@/lib/data/dashboard';import { FileWarning, CheckCircle2, Clock3, Users, LucideIcon } from 'lucide-react';

const iconMap: Record<ServerActivityIcon, LucideIcon> = {
  fileWarning: FileWarning,
  checkCircle: CheckCircle2,
  clock: Clock3,
  users: Users,
};

interface RecentActivitiesProps {
  activities: (ServerActivityItem & { variant?: ServerActivityVariant })[]; // Afegim variant opcional
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const t = useTranslations('DashboardClient');

  return (
    // ✅ CORRECCIÓ: Apliquem una alçada màxima i activem l'overflow per al scroll.
    // Els valors de padding (pr) i marge (mr) negatiu són per amagar la barra de scroll
    // i que només aparegui en fer hover, un truc visual comú.
    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 -mr-2">
      {activities.length > 0
        ? activities.map((act, idx) => {
          const IconComponent = iconMap[act.icon];
          return <ActivityItem
            key={idx}
            icon={IconComponent}
            title={act.title}
            meta={act.meta}
            href={act.href}
            variant={act.variant || 'default'} // Passem la variant
          />;
        })
        : <p className="text-sm text-muted-foreground">{t('noActivities')}</p>
      }
    </div>
  );
}