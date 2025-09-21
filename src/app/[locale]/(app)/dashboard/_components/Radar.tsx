/**
 * @file Radar.tsx
 * @summary Renderitza la secció "Radar" amb elements que requereixen atenció.
 */
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { FileWarning, MessageSquare, Send, AlertTriangle } from 'lucide-react';
import type { Invoice, Contact, Notification } from '@/types/crm';
import { ActivityItem } from './ActivityItem';

interface RadarProps {
  attentionContacts: Contact[];
  overdueInvoices: Invoice[];
  notifications: Notification[];
}

export function Radar({ attentionContacts, overdueInvoices, notifications }: RadarProps) {
  const t = useTranslations('DashboardClient');
  
  // ✅ MILLORA: Unifiquem tots els elements en una sola llista
  const allItems = [
    ...notifications.map(item => ({ ...item, itemType: 'notification', date: new Date(item.created_at) })),
    ...overdueInvoices.map(item => ({ ...item, itemType: 'invoice', date: new Date(item.due_date) })),
    ...attentionContacts.map(item => ({ ...item, itemType: 'contact', date: new Date(item.last_interaction_at || 0) }))
  ];

  // ✅ MILLORA: Ordenem la llista per data, de més recent a més antiga.
  allItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  const hasItems = allItems.length > 0;

  return (
    <div className="rounded-2xl p-6 ring-1 ring-border bg-card flex flex-col h-96">
      <h2 className="text-xl font-bold text-foreground mb-4 flex-shrink-0">{t('radar')}</h2>
      
      <div className="space-y-3 flex-grow overflow-y-auto -mr-2 pr-2">
        {!hasItems ? (
          <p className="text-sm text-muted-foreground h-full flex items-center justify-center">{t('allInOrder')}</p>
        ) : (
          // Renderitzem la llista unificada i ordenada
          allItems.map((item) => {
            if (item.itemType === 'notification') {
              const notif = item as Notification;
              const isError = notif.type === 'post_failed' || notif.type === 'integration_expired';
              return (
                <ActivityItem 
                  key={`notif-${notif.id}`} 
                  href={notif.type?.includes('integration') ? "/settings/integrations" : "/comunicacio/planificador"}
                  icon={isError ? AlertTriangle : Send} 
                  tone={isError ? {bg: 'bg-destructive/10', text: 'text-destructive'} : {bg: 'bg-green-500/10', text: 'text-green-500'}} 
                  title={notif.message} 
                  meta={isError ? t('actionRequired') : t('publishedSuccess')}
                />
              );
            }
            if (item.itemType === 'invoice') {
              const inv = item as Invoice;
              return (
                <ActivityItem 
                  key={`inv-${inv.id}`} 
                  href="/finances/facturacio" 
                  icon={FileWarning} 
                  tone={{bg: 'bg-destructive/10', text: 'text-destructive'}} 
                  title={t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' })} 
                  meta={t('dueDate', { dueDate: new Date(inv.due_date).toLocaleDateString() })}
                />
              );
            }
            if (item.itemType === 'contact') {
              const c = item as Contact;
              return (
                <ActivityItem 
                  key={`contact-${c.id}`} 
                  href="/crm/contactes" 
                  icon={MessageSquare} 
                  tone={{bg: 'bg-primary/10', text: 'text-primary'}} 
                  title={t('coolingContact', { contactName: c.nom })}
                  meta={t('noInteraction7Days')}
                />
              );
            }
            return null;
          })
        )}
      </div>
    </div>
  );
}

