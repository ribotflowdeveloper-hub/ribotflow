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

// ✅ MILLORA #1: Creem una funció 'helper' per formatar el temps relatiu
function formatRelativeTime(dateString: string | null, t: TranslationFunction): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t('time.now');
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t('time.minutesAgo', { count: diffInMinutes });
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t('time.hoursAgo', { count: diffInHours });
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return t('time.yesterday');
  }
  if (diffInDays < 7) {
    return t('time.daysAgo', { count: diffInDays });
  }

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

  const hasItems = allItems.length > 0;

  return (
    <div className="rounded-2xl p-6 ring-1 ring-border bg-card flex flex-col h-96">
      <h2 className="text-xl font-bold text-foreground mb-4 flex-shrink-0">{t('radar')}</h2>
      
      <div className="space-y-3 flex-grow overflow-y-auto -mr-2 pr-2">
        {!hasItems ? (
          <p className="text-sm text-muted-foreground h-full flex items-center justify-center">{t('allInOrder')}</p>
        ) : (
          allItems.map((item) => {
            if (item.itemType === 'notification') {
              const notif = item as Tables<"notifications">;
              const isError = notif.type === 'post_failed' || notif.type === 'integration_expired';
              return (
                <ActivityItem 
                  key={`notif-${notif.id}`} 
                  href={notif.type?.includes('integration') ? "/settings/integrations" : "/comunicacio/planificador"}
                  icon={isError ? AlertTriangle : Send} 
                  tone={isError ? {bg: 'bg-destructive/10', text: 'text-destructive'} : {bg: 'bg-green-500/10', text: 'text-green-500'}} 
                  title={notif.message} 
                  // ✅ MILLORA #2: Utilitzem la nostra nova funció per a la propietat 'meta'
                  meta={formatRelativeTime(notif.created_at, t)}
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
    </div>
  );
}

