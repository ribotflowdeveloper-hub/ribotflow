"use client";
import Link from 'next/link';
import { FC, ElementType } from 'react';
import { ArrowRight } from 'lucide-react';

interface StatCardProps {
  href: string;
  icon: ElementType;
  title: string;
  value: string;
  color: string;
  openText: string;
}

export const StatCard: FC<StatCardProps> = ({ href, icon: Icon, title, value, color, openText }) => (
  <Link href={href} className="group block">
    {/* ✅ CORRECCIÓN: Eliminamos 'text-white'. El color de fondo ya define
        que el texto debe ser 'primary-foreground' (blanco) según tus variables CSS. */}
    <div className={`rounded-2xl p-5 shadow-xl transition-all ring-1 ring-black/10 dark:ring-white/10 hover:-translate-y-0.5 hover:shadow-2xl ${color}`}>
      <div className="flex items-start justify-between">
        <div className="text-sm/5 opacity-90">{title}</div>
        <Icon className="w-6 h-6 opacity-90" />
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-2 inline-flex items-center text-xs opacity-85 group-hover:opacity-100">
        {openText} <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </div>
  </Link>
);