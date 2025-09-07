import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const AttentionContactsWidget = ({ contacts, loading }) => {
  return (
    <div className="glass-effect rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Radar de Contactes 📡</h2>
      <div className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Analitzant...</p> :
         contacts.length > 0 ? contacts.map(contact => (
          <Link to="/crm" key={contact.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg hover:bg-white/10">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0"/>
            <span className="flex-1 truncate">{contact.nom}</span>
          </Link>
        )) : <p className="text-sm text-muted-foreground text-center py-2">Cap contacte necessita atenció. Bona feina!</p>
        }
      </div>
    </div>
  );
};

export default AttentionContactsWidget;