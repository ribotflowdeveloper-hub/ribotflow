// src/app/[locale]/(app)/comunicacio/inbox/_components/MobileDetailView.tsx
"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Reply, Info, UserPlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { ContactDialog } from '../../../crm/contactes/_components/ContactDialog';
import { SafeEmailRenderer } from './SafeEmailRenderer';

// ✨ CANVI: Importem els tipus de la nostra única font de la veritat.
import type { Contact, EnrichedTicket } from '@/types/db';

interface MobileDetailViewProps {
  ticket: EnrichedTicket;
  body: string | null;
  isLoading: boolean;
  isPending: boolean;
  onClose: () => void;
  onReply: (ticket: EnrichedTicket) => void;
  onSaveContact: (newlyCreatedContact: Contact, originalTicket: EnrichedTicket) => void;
}

export function MobileDetailView({ ticket, body, isLoading, isPending, onClose, onReply, onSaveContact }: MobileDetailViewProps) {
  const t = useTranslations('InboxPage');
  return (
    <motion.div 
      key={ticket.id} 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }} 
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }} 
      className="absolute inset-0 flex flex-col bg-background z-20"
    >
      <div className="p-2 border-b border-border flex justify-between items-center flex-shrink-0">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0" aria-label={t('closeButton')}>
            <X className="w-5 h-5" />
          </Button>
          <div className="ml-2 truncate">
            <p className="font-semibold truncate" title={ticket.subject ?? undefined}>{ticket.subject}</p>
            <p className="text-sm text-muted-foreground truncate" title={(ticket.contact_nom || ticket.sender_name) ?? undefined}>
              {t('fromLabel')}: {ticket.contact_nom || ticket.sender_name}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="mr-2 flex-shrink-0" onClick={() => onReply(ticket)}>
          <Reply className="mr-2 h-4 w-4" />
          {t('replyButton')}
        </Button>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-4 md:p-6 flex-shrink-0">
          <details className="border rounded-lg p-3 bg-muted/50">
            <summary className="cursor-pointer font-semibold flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-primary" /> {t('senderDetailsLabel')}
            </summary>
            <div className="mt-3 pt-3 border-t space-y-2 text-sm">
              {/* ✨ CORRECCIÓ: Utilitzem les propietats planes de EnrichedTicket */}
              <p><strong>{t('nameLabel')}:</strong> {ticket.contact_nom || ticket.sender_name}</p>
              <p><strong>{t('emailLabel')}:</strong> {ticket.contact_email || ticket.sender_email}</p>
              {!ticket.contact_id && (
                <ContactDialog
                  trigger={
                    <Button size="sm" className="w-full mt-2" disabled={isPending}>
                      <UserPlus className="w-4 h-4 mr-2"/>
                      {t('saveContactButton')}
                    </Button>
                  }
                  initialData={{
                    nom: ticket.sender_name || '',
                    email: ticket.sender_email || ''
                  }}
                  onContactSaved={(newContact) => onSaveContact(newContact as Contact, ticket)}
                />
              )}
            </div>
          </details>
        </div>
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="absolute inset-0">
                 <SafeEmailRenderer htmlBody={body || ''} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}