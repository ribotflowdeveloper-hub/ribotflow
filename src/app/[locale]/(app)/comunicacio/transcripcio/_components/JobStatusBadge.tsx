"use client";

import React from 'react';
// ✅ CANVI: Importem el tipus des de la font original
import type { AudioJob } from '@/types/db';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

// Definim el tipus d'estat basant-nos en el tipus importat
type JobStatus = AudioJob['status'];

// Definim els colors adaptables per a tema clar/fosc
const statusStyles: Record<JobStatus | 'default', { className: string; icon: React.ElementType }> = {
  completed: {
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
    icon: CheckCircle,
  },
  failed: {
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    icon: XCircle,
  },
  processing: {
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    icon: Loader2,
  },
  pending: {
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    icon: Loader2,
  },
  default: {
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30',
    icon: Loader2,
  },
};

// Mapejem els estats a les traduccions
const statusLabels: Record<JobStatus | 'default', string> = {
  completed: 'Completat',
  failed: 'Fallit',
  processing: 'En progrés',
  pending: 'Pendent',
  default: 'Desconegut',
};

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const style = statusStyles[status] ?? statusStyles.default;
  const label = statusLabels[status] ?? statusLabels.default;
  const Icon = style.icon;
  const isSpinning = status === 'pending' || status === 'processing';

  return (
    <Badge variant="outline" className={style.className}>
      <Icon className={`mr-1 h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}