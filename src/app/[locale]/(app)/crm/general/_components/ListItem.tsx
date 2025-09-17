"use client";

import React, { FC, ElementType } from 'react';
import Link from 'next/link';

interface ListItemProps {
    href: string;
    icon: ElementType;
    iconColor: string;
    title: string;
    subtitle?: string;
    value?: string;
}

/**
 * @summary Mostra un element de llista genèric, clicable, per a rànquings.
 */
export const ListItem: FC<ListItemProps> = ({ href, icon: Icon, iconColor, title, subtitle, value }) => (
    <Link href={href} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors">
        <div className="p-2 rounded-lg bg-white/5">
            <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{title}</p>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {value && <div className="font-semibold text-right">{value}</div>}
    </Link>
);