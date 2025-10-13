"use client";

import { useTranslations } from 'next-intl';
// ✅ CORRECCIÓ: Eliminem l'import del tipus antic
// import type { DashboardStats } from '@/types/crm';

// Definim el tipus de 'stats' exactament com el rebem
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

  return (
    <div className="lg:col-span-2 rounded-2xl p-6 ring-1 ring-border bg-card text-card-foreground">
      <h2 className="text-xl font-bold mb-4">{t('salesPerformance')}</h2>
      
      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" 
          style={{ width: `${percentGoal}%` }} 
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{percentGoal}{t('goalCompleted')}</span>
        <span>€{stats.invoiced?.toLocaleString()} / €{monthlyGoal.toLocaleString()}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-background ring-1 ring-border">
          <div className="text-xs text-muted-foreground">{t('invoicedMonth')}</div>
          <div className="text-lg font-semibold">€{stats.invoiced?.toLocaleString()}</div>
          <div className={`text-xs mt-1 ${stats.invoicedIsPositive ? 'text-green-500' : 'text-red-500'}`}>
            {stats.invoicedChange}
          </div>
        </div>
        <div className="rounded-xl p-4 bg-background ring-1 ring-border">
          <div className="text-xs text-muted-foreground">{t('expensesMonth')}</div>
          <div className="text-lg font-semibold">€{stats.expenses?.toLocaleString()}</div>
          <div className={`text-xs mt-1 ${stats.expensesIsPositive ? 'text-green-500' : 'text-red-500'}`}>
            {stats.expensesChange}
          </div>
        </div>
        <div className="rounded-xl p-4 bg-background ring-1 ring-border">
          <div className="text-xs text-muted-foreground">{t('netProfit')}</div>
          <div className="text-lg font-semibold text-green-500">
            €{(stats.invoiced - stats.expenses).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}