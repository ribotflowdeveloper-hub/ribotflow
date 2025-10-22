// Ubicació: src/components/shared/ActivityItem.tsx

"use client";

import React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

// Variants per al fons de la icona
const iconContainerVariants = cva(
  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        success: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
        danger: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
        warning: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface ActivityItemProps extends VariantProps<typeof iconContainerVariants> {
  icon: LucideIcon;
  title: string;
  meta: string;
  href?: string;
}

export function ActivityItem({ icon: Icon, title, meta, href, variant }: ActivityItemProps) {
  const content = (
    <div className="flex items-center gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50">
      <div className={cn(iconContainerVariants({ variant }))}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="w-full">{content}</Link>;
  }

  return content;
}