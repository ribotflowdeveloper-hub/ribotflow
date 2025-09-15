/**
 * @file FinancialWidget.tsx
 * @summary Aquest fitxer defineix un component de client purament presentacional per al Dashboard.
 * La seva única funció és mostrar un resum de les mètriques financeres clau (facturació,
 * despeses, etc.) d'una manera visualment atractiva.
 */

import type { FC } from 'react';

// Tipus per a les dades financeres que espera el component.
type FinancialStats = {
  invoiced: number;
  invoicedChange: string;
  invoicedIsPositive: boolean;
  pending: number;
  expenses: number;
  expensesChange: string;
  expensesIsPositive: boolean;
};

interface FinancialMetricCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

/**
 * @summary Sub-component que renderitza una única targeta de mètrica financera.
 */
const FinancialMetricCard: FC<FinancialMetricCardProps> = ({ title, value, change, isPositive }) => (
  <div className="metric-card p-4">
    <p className="text-sm text-muted-foreground mb-1">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
    {/* Renderització condicional per al canvi percentual, amb color verd o vermell. */}
    {change && <p className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{change}</p>}
  </div>
);

interface FinancialWidgetProps {
  stats: FinancialStats;
}

/**
 * @summary El component principal del widget financer.
 */
const FinancialWidget: FC<FinancialWidgetProps> = ({ stats }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">💰 El Cofre del Tresor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinancialMetricCard title="Facturat (Aquest mes)" value={`€${stats.invoiced.toLocaleString()}`} change={stats.invoicedChange} isPositive={stats.invoicedIsPositive} />
        <FinancialMetricCard title="Pendent de Cobrament" value={`€${stats.pending.toLocaleString()}`} />
        <FinancialMetricCard title="Despeses (Aquest mes)" value={`€${stats.expenses.toLocaleString()}`} change={stats.expensesChange} isPositive={stats.expensesIsPositive} />
        {/* Targeta especial per al benefici net, calculat al moment. */}
        <div className="metric-card p-4 flex flex-col justify-center items-center bg-green-500/10 hover:bg-green-500/20">
          <p className="text-sm text-green-300">Benefici Net (Est.)</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            €{(stats.invoiced - stats.expenses).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialWidget;
