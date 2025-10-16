// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useInboxStateAndFilters.ts
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { EnrichedTicket, TicketFilter } from '@/types/db';
import type { InitialData as ComposeInitialData } from '../_components/ComposeDialog';

export function useInboxStateAndFilters(user: User) {
  const searchParams = useSearchParams();

  const [selectedTicket, setSelectedTicket] = useState<EnrichedTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<EnrichedTicket | null>(null);
  const [activeFilter, setActiveFilter] = useState<TicketFilter>('rebuts');
  const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeInitialData | null }>({ open: false, initialData: null });
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<string>(user.id);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

  return {
    // States
    selectedTicket,
    ticketToDelete,
    activeFilter,
    composeState,
    isContactPanelOpen,
    inboxFilter,
    searchTerm,
    // Setters
    setSelectedTicket,
    setTicketToDelete,
    setActiveFilter,
    setComposeState,
    setIsContactPanelOpen,
    setInboxFilter,
    setSearchTerm,
  };
}