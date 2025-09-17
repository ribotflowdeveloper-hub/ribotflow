/**
 * @file SalesPerformance.tsx
 * @summary Renderitza la secció de rendiment de vendes del Dashboard.
 */
"use client";

import { useTranslations } from 'next-intl';
import type { DashboardStats } from '../types';

interface SalesPerformanceProps {
  stats: DashboardStats;
  percentGoal: number;
  monthlyGoal: number;
}

export function SalesPerformance({ stats, percentGoal, monthlyGoal }: SalesPerformanceProps) {
  const t = useTranslations('DashboardClient');

  return (
    <div className="lg:col-span-2 rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
      <h2 className="text-xl font-bold text-white mb-4">{t('salesPerformance')}</h2>
      
      {/* Barra de progrés de l'objectiu mensual */}
      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" 
          style={{ width: `${percentGoal}%` }} 
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-white/80">
        <span>{percentGoal}{t('goalCompleted')}</span>
        <span>€{stats.invoiced?.toLocaleString()} / €{monthlyGoal.toLocaleString()}</span>
      </div>

      {/* Targetes de resum financer */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10">
          <div className="text-xs text-white/70">{t('invoicedMonth')}</div>
          <div className="text-lg font-semibold text-white">€{stats.invoiced?.toLocaleString()}</div>
          <div className={`text-xs mt-1 ${stats.invoicedIsPositive ? 'text-emerald-300' : 'text-red-300'}`}>
            {stats.invoicedChange}
          </div>
        </div>
        <div className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10">
          <div className="text-xs text-white/70">{t('expensesMonth')}</div>
          <div className="text-lg font-semibold text-white">€{stats.expenses?.toLocaleString()}</div>
          <div className={`text-xs mt-1 ${stats.expensesIsPositive ? 'text-emerald-300' : 'text-red-300'}`}>
            {stats.expensesChange}
          </div>
        </div>
        <div className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10">
          <div className="text-xs text-white/70">{t('netProfit')}</div>
          <div className="text-lg font-semibold text-emerald-300">
            €{(Number(stats.invoiced || 0) - Number(stats.expenses || 0)).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}