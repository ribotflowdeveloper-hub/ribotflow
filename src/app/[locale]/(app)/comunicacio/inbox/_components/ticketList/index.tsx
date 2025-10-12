// src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/index.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

// ✨ CANVI: Importem els tipus des de la nostra font de veritat.
import type { EnrichedTicket, TeamMemberWithProfile, InboxPermission, TicketFilter } from '@/types/db';

import { TicketListHeader } from './TicketListHeader';
import { TicketListFilters } from './TicketListFilters';
import { TicketListItem } from './TicketListItem';

// Aquest tipus és per a la UI, enriqueix el tipus de la DB amb dades de client.
export type UITicket = EnrichedTicket & { ownerColorClass?: string };

interface TicketListProps {
  user: User;
  teamMembers: TeamMemberWithProfile[];
  permissions: InboxPermission[];
  tickets: UITicket[]; 
  selectedTicketId: number | null;
  activeFilter: string;
  inboxFilter: string;
  onSetInboxFilter: (userId: string) => void;
  unreadCount: number;
  sentCount: number;
  isPendingRefresh: boolean;
  totalCount: number;
  // ✨ CORRECCIÓ: Les funcions callback ara esperen el tipus correcte EnrichedTicket.
  onSelectTicket: (ticket: EnrichedTicket) => void;
  onDeleteTicket: (ticket: EnrichedTicket) => void;
  onSetFilter: (filter: TicketFilter) => void;
  onComposeNew: () => void;
  onRefresh: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const TicketList: React.FC<TicketListProps> = (props) => {
  const { tickets, selectedTicketId, onSelectTicket, onDeleteTicket, hasMore, onLoadMore, isPendingRefresh } = props;

  return (
    <div className="w-full h-full flex flex-col flex-shrink-0 border-r border-border glass-card">
      <TicketListHeader {...props} />
      <TicketListFilters {...props} />
      
      <div className="flex-1 h-0 overflow-y-auto">
        {tickets.length > 0 ? (
          tickets.map(ticket => (
            <TicketListItem
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedTicketId === ticket.id}
              onSelectTicket={onSelectTicket}
              onDeleteTicket={onDeleteTicket}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Safata d'entrada buida.</p>
          </div>
        )}
      </div>
      
      {hasMore && (
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" className="w-full" onClick={onLoadMore} disabled={isPendingRefresh}>
            {isPendingRefresh ? "Carregant..." : "Carregar més"}
          </Button>
        </div>
      )}
    </div>
  );
};