"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { ActivityItem } from '@/components/shared/ActivityItem';
import { Tables } from '@/types/supabase';
import { Inbox, Mail, MailOpen } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export type EnrichedEmail = Tables<'tickets'> & {
  contacts: { nom: string } | null;
  last_message_at: string; 
};

interface RecentEmailsProps {
  emails: EnrichedEmail[];
}

export function RecentEmails({ emails }: RecentEmailsProps) {
  const t = useTranslations('DashboardClient');

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Inbox className="w-12 h-12 text-muted-foreground/50 mb-2" />
        <p className="font-semibold">{t('inbox.emptyTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('inbox.emptySubtitle')}</p>
      </div>
    );
  }

  return (
    // ✅ SOLUCIÓ FINAL: Estructura simple que imita 'RecentActivities'.
    // 'h-full' funciona perquè el pare ('DashboardCard') té una alçada fixa.
    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 -mr-2">
      {emails.slice(0, 10).map(email => {
        const messageTime = new Date(email.last_message_at).toLocaleTimeString('ca-ES', {
          hour: '2-digit',
          minute: '2-digit',
        });
        
        const IconComponent = email.status === 'Llegit' ? MailOpen : Mail;

        return (
          <div key={email.id} className={cn(email.status === 'Llegit' && 'opacity-70')}>
            <ActivityItem
              href={`/comunicacio/inbox?ticketId=${email.id}`}
              icon={IconComponent}
              variant="info"
              title={email.subject || '(Sense assumpte)'}
              meta={`${email.contacts?.nom || 'Desconegut'} · ${messageTime}`}
            />
          </div>
        );
      })}
    </div>
  );
}