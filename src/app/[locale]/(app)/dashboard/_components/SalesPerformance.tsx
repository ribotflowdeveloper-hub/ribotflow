"use client";

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowUp, ArrowDown, Target, Handshake } from 'lucide-react';

// Dades de mostra per la gràfica. A la pràctica, vindrien de les teves dades.
const monthlyData = [
  { month: 'Jul', facturat: 28000 },
  { month: 'Ago', facturat: 35000 },
  { month: 'Set', facturat: 41000 },
  { month: 'Oct', facturat: 52000 },
];

interface SalesPerformanceProps {
  stats: {
    invoiced: number;
    expenses: number;
    invoicedChange: string;
    expensesChange: string;
    invoicedIsPositive: boolean;
    expensesIsPositive: boolean;
    opportunities?: number; // KPI afegit
    activeClients?: number; // KPI afegit
  };
  percentGoal: number;
  monthlyGoal: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const KPICard = ({ title, value, change, isPositive, icon: Icon }: KPICardProps) => (
  <div className="rounded-lg p-4 bg-background/50 border flex flex-col justify-between">
    <div>
      <div className="flex items-center text-xs text-muted-foreground"><Icon className="w-4 h-4 mr-2" /><span>{title}</span></div>
      <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
    </div>
    {change && (
       <div className={cn(
         "text-xs font-medium mt-1 flex items-center",
         // ✅ CORRECCIÓ DARK MODE
         isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
       )}>
         {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
         {change}
       </div>
    )}
  </div>
);

export function SalesPerformance({ stats, percentGoal, monthlyGoal }: SalesPerformanceProps) {
  const t = useTranslations('DashboardClient');

  return (
    <div className="flex flex-col gap-8">
      {/* Secció Superior: Objectiu i KPIs principals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 flex flex-col gap-4">
          <KPICard title={t('invoicedMonth')} value={`€${stats.invoiced.toLocaleString()}`} change={stats.invoicedChange} isPositive={stats.invoicedIsPositive} icon={Target} />
          <KPICard title={t('netProfit')} value={`€${(stats.invoiced - stats.expenses).toLocaleString()}`} icon={Handshake} />
        </div>
        <div className="md:col-span-2 rounded-lg p-4 bg-background/50 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('monthlyEvolution')}</h3>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  />
                  <XAxis
                  dataKey="month"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  />
                  <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `€${Number(value) / 1000}k`}
                  />
                  <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  } as React.CSSProperties}
                  />
                  <Bar
                  dataKey="facturat"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0] as [number, number, number, number]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
      
       {/* Barra de Progrés */}
       <div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          <span>{t('goalProgress')}</span>
          <span><strong className="text-foreground">€{stats.invoiced?.toLocaleString()}</strong> / €{monthlyGoal.toLocaleString()}</span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700 ease-out" 
            style={{ width: `${percentGoal}%` }} 
          />
        </div>
      </div>
    </div>
  );
}