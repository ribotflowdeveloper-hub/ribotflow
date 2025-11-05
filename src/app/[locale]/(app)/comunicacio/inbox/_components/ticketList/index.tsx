// /src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/index.tsx (FITXER COMPLET I CORREGIT)
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Inbox, TriangleAlert, Lock } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import type { EnrichedTicket, TeamMemberWithProfile, InboxPermission, TicketFilter } from '@/types/db';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; 

import { TicketListHeader } from './TicketListHeader';
import { TicketListFilters } from './TicketListFilters';
import { TicketListItem } from './TicketListItem';

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
  onSelectTicket: (ticket: EnrichedTicket) => void;
  onSetFilter: (filter: TicketFilter) => void;
  onComposeNew: () => void;
  onRefresh: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isSelectionMode: boolean;
  selectedTicketIds: Set<number>;
  onToggleSelection: (ticketId: number) => void;
  onToggleSelectionMode: () => void;
  onDeleteSelected: () => void;
  limitStatus: UsageCheckResult; // Aquesta és la prop TICKET_LIMIT_STATUS
}

export const TicketList: React.FC<TicketListProps> = (props) => {
  const {
    tickets,
    selectedTicketId,
    onSelectTicket,
    hasMore,
    onLoadMore,
    isPendingRefresh,
    isSelectionMode,
    selectedTicketIds,
    onToggleSelection,
    limitStatus, // Prop de límit de Tiquets
  } = props;

  const t = useTranslations('InboxPage');
  const t_billing = useTranslations('Billing');

  const isLimitExceeded = !limitStatus.allowed && limitStatus.current > limitStatus.max;
  
  // Tallem la llista de tiquets visibles si se supera el límit
  const visibleTickets = isLimitExceeded 
    ? tickets.slice(0, limitStatus.max) 
    : tickets;

  return (
    <div className="w-full h-full flex flex-col flex-shrink-0 border-r border-border glass-card">
      
      {/* ✅ CORRECCIÓ DEL CRASH:
          Passem 'limitStatus' explícitament al Header.
          L'error 'ts(2322)' significa que 'TicketListHeader' no l'accepta.
          Anirem al següent fitxer (TicketListHeader.tsx) per arreglar-ho.
      */}
      <TicketListHeader
        {...props}
        selectedCount={selectedTicketIds.size}
        limitStatus={limitStatus} // Passa el límit de Tiquets al Header
      />

      <TicketListFilters {...props} />

      {/* ALARMA DE LÍMIT SUPERAT */}
      {isLimitExceeded && (
        <div className="p-3 border-b border-border flex-shrink-0">
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold">
              {t_billing('limitReachedTitle', { default: 'Límit de tiquets assolit' })}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {limitStatus.error || t_billing('limitReachedDefault')}
              <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold">
                <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 h-0 overflow-y-auto">
        <AnimatePresence initial={false}>
          {visibleTickets.length > 0 ? (
            visibleTickets.map(ticket => (
              <TicketListItem
                key={ticket.id}
                ticket={ticket}
                isSelectionMode={isSelectionMode}
                isSelected={selectedTicketIds.has(ticket.id!)}
                isCurrentlyViewed={selectedTicketId === ticket.id}
                onToggleSelection={onToggleSelection}
                onSelectTicket={onSelectTicket}
              />
            ))
          ) : (
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
            disabled={isPendingRefresh || isSelectionMode || isLimitExceeded} 
          >
            {isLimitExceeded ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {t('limitReached', { default: 'Límit assolit' })}
              </>
            ) : isPendingRefresh ? (
              t('loading')
            ) : (
              t('loadMore')
            )}
          </Button>
        </div>
      )}
    </div>
  );
};