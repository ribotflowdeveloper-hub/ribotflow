// src/app/[locale]/(app)/comunicacio/inbox/_components/TicketDetail.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Reply, MoreVertical, Loader2, Info } from 'lucide-react';
import { SafeEmailRenderer } from './SafeEmailRenderer';

// ✨ CANVI: Importem el tipus correcte des de la nostra font de veritat.
import type { EnrichedTicket } from '@/types/db';

interface TicketDetailProps {
  ticket: EnrichedTicket | null; // ✨ CANVI: Ara espera el tipus correcte.
  body: string | null;
  isLoading: boolean;
  onReply: (ticket: EnrichedTicket) => void;
  isContactPanelOpen: boolean;
  onToggleContactPanel: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  body,
  isLoading,
  onReply,
  isContactPanelOpen,
  onToggleContactPanel,
}) => {
  const t = (key: string) => ({
    noTicketSelected: "Selecciona un correu per llegir-lo",
    from: "De",
    to: "Per a",
    reply: "Respon",
  }[key] || key);

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('noTicketSelected')}</p>
      </div>
    );
  }

  // ✨ CORRECCIÓ: Accedim a les dades de contacte planes directament des del tiquet.
  const senderName = ticket.contact_nom || ticket.sender_name || 'Desconegut';
  const senderEmail = ticket.contact_email || ticket.sender_email;
  const avatarUrl = ticket.profile_avatar_url;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar>
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
          </Avatar>
          <div className="truncate">
            <p className="font-semibold truncate">{senderName}</p>
            <p className="text-sm text-muted-foreground truncate" title={senderEmail ?? undefined}>{senderEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleContactPanel}>
            <Info className={`w-5 h-5 ${isContactPanelOpen ? 'text-primary' : ''}`} />
          </Button>
          <Button onClick={() => onReply(ticket)}>
            <Reply className="mr-2 h-4 w-4" />
            {t('reply')}
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 border-b flex-shrink-0">
        <h2 className="text-xl font-bold">{ticket.subject}</h2>
      </div>

      <div className="flex-1 relative min-h-0">
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
  );
};