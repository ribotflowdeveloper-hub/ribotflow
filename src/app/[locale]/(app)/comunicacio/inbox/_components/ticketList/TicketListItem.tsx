// src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/TicketListItem.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from 'lucide-react';
import type { UITicket } from './index'; 
import type { EnrichedTicket } from '@/types/db';

const formatTicketDate = (dateString: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) {
    return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
  }
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

interface TicketListItemProps {
  ticket: UITicket;
  isSelected: boolean;
  onSelectTicket: (ticket: EnrichedTicket) => void;
  onDeleteTicket: (ticket: EnrichedTicket) => void;
}

export const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, isSelected, onSelectTicket, onDeleteTicket }) => {
  
  const handleSelect = () => {
    if (ticket.id !== null) {
      onSelectTicket(ticket as EnrichedTicket);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticket.id !== null) {
      onDeleteTicket(ticket as EnrichedTicket);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`group cursor-pointer border-l-4 relative 
        ${isSelected
          ? 'border-primary bg-muted'
          : `${ticket.ownerColorClass || 'border-transparent'} hover:bg-muted/50`
        }`
      }
    >
      <div className="p-4 flex items-start gap-4">
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
          {/* ✨ CORRECCIÓ 1: L'AvatarImage només utilitza l'URL del perfil de l'usuari assignat. */}
          <AvatarImage src={ticket.profile_avatar_url ?? undefined} />
          {/* ✨ CORRECCIÓ 2: Les inicials són EXCLUSIVAMENT del propietari del tiquet. Si no hi ha, mostra '??'. */}
          <AvatarFallback>{getInitials(ticket.profile_full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className={`truncate font-semibold ${ticket.status === 'Llegit' ? 'font-normal text-muted-foreground' : ''}`}>
              {ticket.contact_nom || ticket.sender_name || 'Remitent desconegut'}
            </p>
            <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
              {ticket.status !== 'Llegit' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
              <span className="text-muted-foreground">{formatTicketDate(ticket.sent_at)}</span>
            </div>
          </div>
          <p className="text-sm font-medium truncate">{ticket.subject}</p>
          <p className="text-sm text-muted-foreground truncate mt-1">{ticket.preview}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={handleDelete}
        title="Elimina"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
};