import React from 'react';
import { Button } from '@/components/ui/button';

const RecentActivityWidget = ({ activity, loading }) => {
  return (
    <div className="glass-effect rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Cròniques del Regne 📜</h2>
      <div className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Carregant cròniques...</p> :
         activity.map(item => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            <item.Icon className="w-4 h-4 mt-1 text-primary/70 shrink-0" />
            <p className="text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivityWidget;