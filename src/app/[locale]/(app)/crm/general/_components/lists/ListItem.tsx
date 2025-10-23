"use client";

import React, { FC, ElementType } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/utils';

interface ListItemProps {
    href: string;
    icon: ElementType;
    iconColor: string;
    title: string;
    subtitle?: string;
    value?: string;
}

export const ListItem: FC<ListItemProps> = ({ href, icon: Icon, iconColor, title, subtitle, value }) => (
    <Link href={href} className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted dark:hover:bg-muted/50 transition-colors">
        <div className={cn("p-2.5 rounded-lg", iconColor.replace('text-', 'bg-') + '/10 dark:' + iconColor.replace('text-', 'bg-') + '/20')}>
            <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {value && <div className="font-semibold text-right text-foreground">{value}</div>}
    </Link>
);