/**
 * @file Radar.tsx
 * @summary Renderitza la secció "Radar" amb elements que requereixen atenció.
 */
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { FileWarning, MessageSquare } from 'lucide-react';
import type { Invoice, Contact } from '../types';
import { ActivityItem } from './ActivityItem';

interface RadarProps {
  attentionContacts: Contact[];
  overdueInvoices: Invoice[];
}

export function Radar({ attentionContacts, overdueInvoices }: RadarProps) {
  const t = useTranslations('DashboardClient');
  
  const hasItems = attentionContacts.length > 0 || overdueInvoices.length > 0;

  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
      <h2 className="text-xl font-bold text-white mb-4">{t('radar')}</h2>
      <div className="space-y-3">
        {!hasItems ? (
          <p className="text-sm text-white/70">{t('allInOrder')}</p>
        ) : (
          <>
            {overdueInvoices.map(inv => (
              <ActivityItem 
                key={inv.id} 
                href="/finances/facturacio" 
                icon={FileWarning} 
                tone={{bg: 'bg-red-500/15', text: 'text-red-300'}} 
                title={t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' })} 
                meta={t('dueDate', { dueDate: new Date(inv.due_date).toLocaleDateString() })}
              />
            ))}
            {attentionContacts.map(c => (
              <ActivityItem 
                key={c.id} 
                href="/crm/contactes" 
                icon={MessageSquare} 
                tone={{bg: 'bg-blue-500/15', text: 'text-blue-300'}} 
                title={t('coolingContact', { contactName: c.nom })}
                meta={t('noInteraction7Days')}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}