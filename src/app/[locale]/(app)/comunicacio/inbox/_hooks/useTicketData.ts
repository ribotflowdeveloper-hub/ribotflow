// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useTicketData.ts (CORREGIT FINAL)
import { useState, useTransition, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import {
  getTicketsAction,
  getTicketBodyAction,
  markTicketAsReadAction,
  getTicketByIdAction
} from '../actions';
import type { EnrichedTicket, TicketFilter } from '@/types/db';

type UseTicketDataProps = {
  initialTickets: EnrichedTicket[];
  activeFilter: TicketFilter;
  inboxFilter: string;
  searchTerm: string;
  onTicketSelected: (ticket: EnrichedTicket) => void; 
  onTicketDeselected: () => void;
};

export function useTicketData({
  initialTickets,
  activeFilter,
  inboxFilter,
  searchTerm,
  onTicketSelected,
  onTicketDeselected,
}: UseTicketDataProps) {
  const [isPending, startTransition] = useTransition();
  const [tickets, setTickets] = useState<EnrichedTicket[]>(initialTickets);
  const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(null);
  const [isBodyLoading, setIsBodyLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialTickets.length > 0);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  useEffect(() => {
    startTransition(async () => {
      const results = await getTicketsAction(1, activeFilter, inboxFilter, debouncedSearchTerm);
      setTickets(results);
      setHasMore(results.length > 0);
      setPage(2);
    });
  }, [activeFilter, inboxFilter, debouncedSearchTerm]);

  const handleSelectTicket = useCallback(async (ticket: EnrichedTicket | null, currentSelectedId: number | undefined | null) => {
    if (currentSelectedId === ticket?.id) return;

    if (!ticket || !ticket.id) {
      setSelectedTicketBody(null);
      onTicketDeselected();
      return;
    }
    
    setIsBodyLoading(true);
    setSelectedTicketBody(null);
    onTicketSelected(ticket);

    try {
      const { body } = await getTicketBodyAction(ticket.id);
      setSelectedTicketBody(body);
    } catch (error) {
      console.error("Error en carregar el cos del tiquet:", error);
      setSelectedTicketBody('<p>Error en carregar el contingut.</p>');
    } finally {
      setIsBodyLoading(false);
    }

    if (ticket.status !== 'Llegit') {
      setTickets(currentTickets =>
        currentTickets.map(t => t.id === ticket.id ? { ...t, status: 'Llegit' as const } : t)
      );
      await markTicketAsReadAction(ticket.id);
    }
  }, [onTicketSelected, onTicketDeselected]);

  const fetchAndSelectTicket = useCallback(async (ticketId: number) => {
    setIsBodyLoading(true);
    const { data: fetchedTicket, error } = await getTicketByIdAction(ticketId);
    
    if (error || !fetchedTicket) {
      toast.error("No s'ha pogut trobar el correu especificat.");
      setIsBodyLoading(false);
      return;
    }
    
    setTickets(prevTickets => {
      if (prevTickets.some(t => t.id === fetchedTicket.id)) {
        return prevTickets;
      }
      return [fetchedTicket, ...prevTickets];
    });

    handleSelectTicket(fetchedTicket, null);
  }, [handleSelectTicket]);

  // ✅ CORRECCIÓ: Restaurem la lògica de 'handleLoadMore'
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isPending) return;
    startTransition(async () => {
      // Ara 'page' es fa servir correctament aquí
      const results = await getTicketsAction(page, activeFilter, inboxFilter, debouncedSearchTerm);
      if (results.length > 0) {
        setTickets(p => [...p, ...results]);
        setPage(p => p + 1);
      } else {
        setHasMore(false);
      }
    });
  }, [page, activeFilter, inboxFilter, debouncedSearchTerm, hasMore, isPending]);

  return {
    isPending,
    tickets,
    setTickets,
    selectedTicketBody,
    isBodyLoading,
    hasMore,
    debouncedSearchTerm,
    handleSelectTicket,
    handleLoadMore,
    fetchAndSelectTicket,
  };
}