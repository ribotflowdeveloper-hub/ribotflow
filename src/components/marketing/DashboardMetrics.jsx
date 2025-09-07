import React from 'react';
import { Target, BarChart2, CheckCircle } from 'lucide-react';

const MetricCard = ({ title, value, icon }) => (
  <div className="glass-effect p-6 rounded-xl flex-1">
    <div className="flex items-center gap-4">
      <div className="bg-purple-500/20 p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-gray-300 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

const DashboardMetrics = ({ kpis }) => (
  <div className="flex flex-col md:flex-row gap-6">
    <MetricCard title="Nous Contactes (Mes)" value={kpis.totalLeads} icon={<Target className="text-purple-400" />} />
    <MetricCard title="Interacció Mitjana" value={kpis.engagementRate} icon={<BarChart2 className="text-purple-400" />} />
    <MetricCard title="Taxa de Conversió" value={kpis.conversionRate} icon={<CheckCircle className="text-purple-400" />} />
  </div>
);

export default DashboardMetrics;