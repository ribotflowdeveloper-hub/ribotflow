"use client";

import React, { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { type Campaign } from '../page';

const statusColors: Record<string, string> = { 'Completat': 'bg-green-500/20 text-green-300', 'Actiu': 'bg-blue-500/20 text-blue-300', 'Planificat': 'bg-yellow-500/20 text-yellow-300' };

interface CampaignListProps {
  campaigns: Campaign[];
  onCampaignSelect: (campaign: Campaign) => void;
}

export const CampaignList: FC<CampaignListProps> = ({ campaigns, onCampaignSelect }) => (
  <div className="glass-effect rounded-xl overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-white/5"><tr className="border-b border-border"><th className="p-4 font-semibold">Campanya</th><th className="p-4 font-semibold hidden md:table-cell">Tipus</th><th className="p-4 font-semibold">Estat</th><th className="p-4 font-semibold hidden md:table-cell">Data</th></tr></thead>
      <tbody>
        {campaigns.map(c => (
          <tr key={c.id} className="border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onCampaignSelect(c)}>
            <td className="p-4 font-medium">{c.name}</td>
            <td className="p-4 text-gray-300 hidden md:table-cell">{c.type}</td>
            <td className="p-4"><Badge className={statusColors[c.status]} variant={undefined}>{c.status}</Badge></td>
            <td className="p-4 text-gray-300 hidden md:table-cell">{format(new Date(c.campaign_date), "d MMM, yyyy", { locale: ca })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);