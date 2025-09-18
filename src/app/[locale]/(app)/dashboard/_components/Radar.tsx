/**
 * @file Radar.tsx
 * @summary Renderitza la secció "Radar" amb elements que requereixen atenció.
 */
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { FileWarning, MessageSquare } from 'lucide-react';
import type { Invoice, Contact } from '@/types/crm';
import { ActivityItem } from './ActivityItem';

interface RadarProps {
  attentionContacts: Contact[];
  overdueInvoices: Invoice[];
}

export function Radar({ attentionContacts, overdueInvoices }: RadarProps) {
  const t = useTranslations('DashboardClient');
  
  const hasItems = attentionContacts.length > 0 || overdueInvoices.length > 0;

  return (
    // ✅ CORRECCIÓ: Usem 'bg-card' que s'adapta al tema.
    <div className="rounded-2xl p-6 ring-1 ring-border bg-card">
      <h2 className="text-xl font-bold text-foreground mb-4">{t('radar')}</h2>
      <div className="space-y-3">
        {!hasItems ? (
          <p className="text-sm text-muted-foreground">{t('allInOrder')}</p>
        ) : (
          <>
            {overdueInvoices.map(inv => (
              <ActivityItem 
                key={inv.id} 
                href="/finances/facturacio" 
                icon={FileWarning} 
                // ✅ CORRECCIÓ: Usem colors semàntics que funcionen en ambdós temes.
                tone={{bg: 'bg-destructive/10', text: 'text-destructive'}} 
                title={t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' })} 
                meta={t('dueDate', { dueDate: new Date(inv.due_date).toLocaleDateString() })}
              />
            ))}
            {attentionContacts.map(c => (
              <ActivityItem 
                key={c.id} 
                href="/crm/contactes" 
                icon={MessageSquare} 
                // ✅ CORRECCIÓ: Usem colors semàntics.
                tone={{bg: 'bg-primary/10', text: 'text-primary'}} 
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