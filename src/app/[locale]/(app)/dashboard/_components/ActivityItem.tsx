/**
 * @file ActivityItem.tsx
 * @summary Component presentacional per a un únic ítem al feed d'activitats.
 */
"use client";

import Link from 'next/link';
import { FC, ElementType } from 'react';

interface ActivityItemProps {
  icon: ElementType;
  tone: { bg: string; text: string };
  title: string;
  meta: string;
  href: string;
}

export const ActivityItem: FC<ActivityItemProps> = ({ icon: Icon, tone, title, meta, href }) => (
  <Link href={href} className="block">
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 rounded-full p-2 ${tone.bg} ${tone.text}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  </Link>
);