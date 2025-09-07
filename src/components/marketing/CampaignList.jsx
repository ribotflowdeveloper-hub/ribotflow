import React from 'react';
import { Badge } from '@/components/ui/badge'; // Suposant que tens un component Badge

const statusColors = {
  'Completat': 'bg-green-500/20 text-green-300',
  'Actiu': 'bg-blue-500/20 text-blue-300',
  'Planificat': 'bg-yellow-500/20 text-yellow-300',
};

const CampaignList = ({ campaigns }) => (
  <div className="glass-effect rounded-xl overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-white/5">
        <tr>
          <th className="p-4 font-semibold">Campanya</th>
          <th className="p-4 font-semibold">Tipus</th>
          <th className="p-4 font-semibold">Estat</th>
          <th className="p-4 font-semibold">Data</th>
          <th className="p-4 font-semibold">Resultats Clau</th>
        </tr>
      </thead>
      <tbody>
        {campaigns.map(c => (
          <tr key={c.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
            <td className="p-4 font-medium">{c.name}</td>
            <td className="p-4 text-gray-300">{c.type}</td>
            <td className="p-4">
              <Badge className={statusColors[c.status]}>{c.status}</Badge>
            </td>
            <td className="p-4 text-gray-300">{new Date(c.date).toLocaleDateString('ca-ES')}</td>
            <td className="p-4 text-gray-300">
                {c.metrics.sends ? `${c.metrics.sends} enviaments` : c.metrics.impressions ? `${c.metrics.impressions} impressions` : c.metrics.views ? `${c.metrics.views} vistes` : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CampaignList;