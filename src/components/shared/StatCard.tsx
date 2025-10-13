"use client";
import Link from 'next/link';
import { FC, ElementType } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/utils'; // ✅ AFEGEIX AQUESTA LÍNIA

interface StatCardProps {
  href: string;
  icon: ElementType;
  title: string;
  value: string;
  color: string;
  openText: string;
}

export const StatCard: FC<StatCardProps> = ({ href, icon: Icon, title, value, color, openText }) => (
  <Link href={href} className="group block rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
    <div className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <span className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</span>
        </div>
        <div className={cn("rounded-lg p-2", color.replace('text-', 'bg-') + '/10')}>
            <Icon className={cn("h-6 w-6", color)} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
        {openText} <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </div>
  </Link>
);