"use client";

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils'; // ✅ AFEGEIX AQUESTA LÍNIA

interface SalesPerformanceProps {
  stats: {
    invoiced: number;
    expenses: number;
    invoicedChange: string;
    expensesChange: string;
    invoicedIsPositive: boolean;
    expensesIsPositive: boolean;
  };
  percentGoal: number;
  monthlyGoal: number;
}

export function SalesPerformance({ stats, percentGoal, monthlyGoal }: SalesPerformanceProps) {
  const t = useTranslations('DashboardClient');

  // ✅ CORRECCIÓ: Embolcallem tot en un sol 'div'. Això permetrà que el Collapsible funcioni.
  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Progrés */}
      <div>
        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${percentGoal}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span><strong className="text-foreground">{percentGoal}%</strong> {t('goalCompleted')}</span>
          <span><strong className="text-foreground">€{stats.invoiced?.toLocaleString()}</strong> / €{monthlyGoal.toLocaleString()}</span>
        </div>
      </div>


      {/* Mini-Cards de mètriques */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card Facturació */}
        <div className="rounded-lg p-4 bg-background border">
          <div className="text-xs text-muted-foreground">{t('invoicedMonth')}</div>
          <div className="text-xl font-bold text-foreground mt-1">€{stats.invoiced?.toLocaleString()}</div>
          <div className={cn(
              "text-xs font-medium mt-1",
              stats.invoicedIsPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {stats.invoicedChange}
          </div>
        </div>
        {/* Card Despeses */}
        <div className="rounded-lg p-4 bg-background border">
          <div className="text-xs text-muted-foreground">{t('expensesMonth')}</div>
          <div className="text-xl font-bold text-foreground mt-1">€{stats.expenses?.toLocaleString()}</div>
          <div className={cn(
              "text-xs font-medium mt-1",
              stats.expensesIsPositive ? 'text-green-600' : 'text-red-600' // Per a despeses, potser vols invertir la lògica
          )}>
            {stats.expensesChange}
          </div>
        </div>
        {/* Card Benefici Net */}
        <div className="rounded-lg p-4 bg-background border">
          <div className="text-xs text-muted-foreground">{t('netProfit')}</div>
          <div className="text-xl font-bold text-green-600 mt-1">
            €{(stats.invoiced - stats.expenses).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1 invisible">_</div>
        </div>
      </div>
      
    </div>
  );
}