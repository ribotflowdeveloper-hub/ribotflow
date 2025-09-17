/**
 * @file MobileDetailView.tsx
 * @summary Vista de detall que llisca en dispositius mòbils.
 */
"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Reply, Info, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DOMPurify from 'dompurify';
import type { Ticket } from '@/types/comunicacio/inbox';

interface MobileDetailViewProps {
  ticket: Ticket;
  body: string | null;
  isLoading: boolean;
  isPending: boolean;
  onClose: () => void;
  onReply: (ticket: Ticket) => void;
  onSaveContact: (ticket: Ticket) => void;
}

export function MobileDetailView({ ticket, body,  isPending, onClose, onReply, onSaveContact }: MobileDetailViewProps) {
  const t = useTranslations('InboxPage');
  
  return (
    <motion.div key={ticket.id} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute inset-0 flex flex-col bg-background z-10">
      <div className="p-2 border-b border-border flex justify-between items-center flex-shrink-0">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="ml-2 truncate">
            <p className="font-semibold truncate">{ticket.subject}</p>
            <p className="text-sm text-muted-foreground truncate">{ticket.contacts?.nom || ticket.sender_name}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="mr-2 flex-shrink-0" onClick={() => onReply(ticket)}><Reply className="mr-2 h-4 w-4" />{t('replyButton')}</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
        <details className="border rounded-lg p-3 mb-4 bg-muted/50">
          <summary className="cursor-pointer font-semibold flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> {t('senderDetailsLabel')}</summary>
          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
            <p><strong>{t('nameLabel')}</strong> {ticket.contacts?.nom || ticket.sender_name}</p>
            <p><strong>{t('emailLabel')}</strong> {ticket.contacts?.email || ticket.sender_email}</p>
            {!ticket.contacts && <Button size="sm" className="w-full mt-2" onClick={() => onSaveContact(ticket)} disabled={isPending}><UserPlus className="w-4 h-4 mr-2"/>{t('saveContactButton')}</Button>}
          </div>
        </details>
        <div className="prose-email max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body || '') }} />
      </div>
    </motion.div>
  );
}