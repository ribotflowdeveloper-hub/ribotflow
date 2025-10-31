"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import type { EnrichedTicket, TeamMemberWithProfile, InboxPermission, TicketFilter } from '@/types/db';

import { TicketListHeader } from './TicketListHeader';
import { TicketListFilters } from './TicketListFilters';
import { TicketListItem } from './TicketListItem';

export type UITicket = EnrichedTicket & { ownerColorClass?: string };

interface TicketListProps {
  user: User;
  teamMembers: TeamMemberWithProfile[];
  permissions: InboxPermission[];
  tickets: UITicket[];
  selectedTicketId: number | null; // Aquest és el tiquet OBERT per VEURE
  activeFilter: string;
  inboxFilter: string;
  onSetInboxFilter: (userId: string) => void;
  unreadCount: number;
  sentCount: number;
  isPendingRefresh: boolean;
  totalCount: number;
  onSelectTicket: (ticket: EnrichedTicket) => void;
  // ❌ onDeleteTicket ja no és una prop de TicketList, es gestionarà al Header
  onSetFilter: (filter: TicketFilter) => void;
  onComposeNew: () => void;
  onRefresh: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;

  // ✅ 1. Noves props per a la selecció
  isSelectionMode: boolean;
  selectedTicketIds: Set<number>; // Un Set és més eficient per a lookups
  onToggleSelection: (ticketId: number) => void;
  onToggleSelectionMode: () => void;
  onDeleteSelected: () => void;
}

export const TicketList: React.FC<TicketListProps> = (props) => {
  const {
    tickets,
    selectedTicketId,
    onSelectTicket,
    hasMore,
    onLoadMore,
    isPendingRefresh,
    // ✅ 2. Extraiem les noves props
    isSelectionMode,
    selectedTicketIds,
    onToggleSelection,
  } = props;

  const t = useTranslations('InboxPage');

  return (
    <div className="w-full h-full flex flex-col flex-shrink-0 border-r border-border glass-card">
      {/* ✅ 3. Passem totes les props (incloses les noves) al Header */}
      <TicketListHeader
        {...props}
        selectedCount={selectedTicketIds.size}
      />

      <TicketListFilters {...props} />

      <div className="flex-1 h-0 overflow-y-auto">
        {/* ✅ 2. Embolcallem la llista amb AnimatePresence */}
        {/* 'initial={false}' evita l'animació en la càrrega inicial */}
        <AnimatePresence initial={false}>
          {tickets.length > 0 ? (
            tickets.map(ticket => (
              <TicketListItem
                key={ticket.id} // La 'key' és fonamental per AnimatePresence
                ticket={ticket}
                isSelectionMode={isSelectionMode}
                isSelected={selectedTicketIds.has(ticket.id!)}
                isCurrentlyViewed={selectedTicketId === ticket.id}
                onToggleSelection={onToggleSelection}
                onSelectTicket={onSelectTicket}
              />
            ))
          ) : (
            // També podem animar l'estat buit
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full p-4 text-center"
            >
              <Inbox className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t('emptyInbox')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasMore && (
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
            disabled={isPendingRefresh || isSelectionMode} // Deshabilitem si estem seleccionant
          >
            {isPendingRefresh ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
};