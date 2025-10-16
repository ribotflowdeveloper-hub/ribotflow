// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useInboxComputed.ts
import { useMemo } from 'react';
import type { EnrichedTicket, TeamMemberWithProfile, TicketFilter } from '@/types/db';

type UITicket = EnrichedTicket & { ownerColorClass?: string };

type UseInboxComputedProps = {
  tickets: EnrichedTicket[];
  activeFilter: TicketFilter;
  inboxFilter: string;
  teamMembers: TeamMemberWithProfile[];
  initialUnreadCount: number;
  initialSentCount: number;
};

export function useInboxComputed({
  tickets,
  activeFilter,
  inboxFilter,
  teamMembers,
  initialUnreadCount,
  initialSentCount,
}: UseInboxComputedProps) {
  
  const filteredTickets = useMemo(() => {
    let displayTickets = tickets;
    if (inboxFilter !== 'all') {
      displayTickets = displayTickets.filter(t => t.user_id === inboxFilter);
    }
    if (activeFilter === 'rebuts') return displayTickets.filter(t => t.type === 'rebut' || !t.type);
    if (activeFilter === 'enviats') return displayTickets.filter(t => t.type === 'enviat');
    if (activeFilter === 'noLlegits') return displayTickets.filter(t => (t.type === 'rebut' || !t.type) && t.status !== 'Llegit');
    return displayTickets;
  }, [tickets, activeFilter, inboxFilter]);

  const enrichedTickets = useMemo<UITicket[]>(() => {
    const userProfileMap = new Map<string, TeamMemberWithProfile>();
    teamMembers.forEach(member => {
      if (member.user_id) {
        userProfileMap.set(member.user_id, member);
      }
    });
    const colors = ['border-blue-500', 'border-green-500', 'border-yellow-500', 'border-purple-500', 'border-pink-500', 'border-indigo-500'];
    
    return filteredTickets.map((ticket, index) => {
      const ownerProfile = ticket.user_id ? userProfileMap.get(ticket.user_id) : undefined;
      return {
        ...ticket,
        profile_full_name: ticket.profile_full_name ?? ownerProfile?.full_name ?? null,
        profile_avatar_url: ticket.profile_avatar_url ?? ownerProfile?.avatar_url ?? null,
        ownerColorClass: ticket.user_id ? colors[index % colors.length] : 'border-transparent',
      };
    });
  }, [filteredTickets, teamMembers]);

  const counts = useMemo(() => ({
    unread: tickets.filter(t => (t.type === 'rebut' || !t.type) && t.status !== 'Llegit').length,
    received: initialUnreadCount,
    sent: initialSentCount,
  }), [tickets, initialUnreadCount, initialSentCount]);

  return { enrichedTickets, counts };
}