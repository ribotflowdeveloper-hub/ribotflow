"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { FileWarning, MessageSquare, Send, AlertTriangle } from 'lucide-react';
import { ActivityItem } from '@/components/shared/ActivityItem';
import { Tables } from "@/types/supabase";

interface RadarProps {
  attentionContacts: Tables<"contacts">[];
  overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
  notifications: Tables<"notifications">[];
}

type TranslationFunction = (key: string, values?: Record<string, string | number>) => string;

function formatRelativeTime(dateString: string | null, t: TranslationFunction): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t('time.now');
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return t('time.minutesAgo', { count: diffInMinutes });
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return t('time.hoursAgo', { count: diffInHours });
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return t('time.yesterday');
  if (diffInDays < 7) return t('time.daysAgo', { count: diffInDays });
  return date.toLocaleDateString();
}

export function Radar({ attentionContacts, overdueInvoices, notifications }: RadarProps) {
  const t = useTranslations('DashboardClient');
  
  const allItems = [
    ...notifications.map(item => ({ ...item, itemType: 'notification', date: new Date(item.created_at) })),
    ...overdueInvoices.map(item => ({ ...item, itemType: 'invoice', date: new Date(item.due_date ?? 0) })),
    ...attentionContacts.map(item => ({ ...item, itemType: 'contact', date: new Date(item.last_interaction_at || 0) }))
  ];

  allItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // ✅ CORRECCIÓ: Eliminem la línia que tallava la llista.
  // const visibleItems = allItems.slice(0, 6); 
  
  const hasItems = allItems.length > 0;

  return (
    <div className="space-y-3 -mr-2 pr-2 overflow-y-auto max-h-[480px]">
      {!hasItems ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground text-center">{t('allInOrder')}</p>
        </div>
      ) : (
        // ✅ CORRECCIÓ: Iterem sobre la llista COMPLETA ('allItems').
        allItems.map((item) => {
          if (item.itemType === 'notification') {
            const notif = item as Tables<"notifications">;
            const isError = notif.type === 'post_failed' || notif.type === 'integration_expired';
            return (
              <ActivityItem 
                key={`notif-${notif.id}`} 
                href={notif.type?.includes('integration') ? "/settings/integrations" : "/comunicacio/planificador"}
                icon={isError ? AlertTriangle : Send} 
                tone={isError ? {bg: 'bg-destructive/10', text: 'text-destructive'} : {bg: 'bg-success/10', text: 'text-success'}} 
                title={notif.message} 
                meta={formatRelativeTime(notif.created_at, t as TranslationFunction)}
              />
            );
          }
          if (item.itemType === 'invoice') {
            const inv = item as Tables<'invoices'> & { contacts: { nom: string } | null };
            return (
              <ActivityItem 
                key={`inv-${inv.id}`} 
                href="/finances/facturacio" 
                icon={FileWarning} 
                tone={{bg: 'bg-destructive/10', text: 'text-destructive'}} 
                title={t('overdueInvoice', { clientName: inv.contacts?.nom ?? 'client' })} 
                meta={t('dueDate', { dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : t('unknownDueDate') })}
              />
            );
          }
          if (item.itemType === 'contact') {
            const c = item as Tables<"contacts">;
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
  );
}