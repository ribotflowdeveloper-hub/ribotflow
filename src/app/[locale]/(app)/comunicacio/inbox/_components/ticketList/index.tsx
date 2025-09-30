"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';

import type { Ticket, TicketFilter } from '@/types/comunicacio/inbox';
import type { User } from '@supabase/supabase-js';

import { TicketListHeader } from './TicketListHeader';
import { TicketListFilters } from './TicketListFilters';
import { TicketListItem } from './TicketListItem';

// Definim els tipus necessaris per a les props
export type EnrichedTicket = Ticket & {
    owner?: { full_name: string | null; avatar_url: string | null; } | null;
    ownerColorClass?: string;
};
export type TeamMember = { profiles: { id: string; full_name: string | null; avatar_url: string | null; } | null; };
export type Permission = { target_user_id: string };

interface TicketListProps {
    user: User;
    teamMembers: TeamMember[];
    permissions: Permission[];
    tickets: EnrichedTicket[];
    selectedTicketId: number | null;
    activeFilter: string;
    inboxFilter: string;
    onSetInboxFilter: (userId: string) => void;
    unreadCount: number;
    sentCount: number;
    isPendingRefresh: boolean;
    totalCount: number;
    onSelectTicket: (ticket: Ticket) => void;
    onDeleteTicket: (ticket: Ticket) => void;
    onSetFilter: (filter: TicketFilter) => void;
    onComposeNew: () => void;
    onRefresh: () => void;
    hasMore: boolean;
    onLoadMore: () => void;
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