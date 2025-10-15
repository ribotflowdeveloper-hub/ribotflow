// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useInbox.ts
import { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import { useDebounce } from 'use-debounce';
import type { User } from '@supabase/supabase-js';

import type { DbTableRow, EnrichedTicket, TeamMemberWithProfile, TicketFilter } from '@/types/db';
import type { InitialData as ComposeInitialData } from '../_components/ComposeDialog';

import {
  deleteTicketAction,
  markTicketAsReadAction,
  linkTicketsToContactAction,
  getTicketBodyAction,
  getTicketsAction,
} from '../actions';

type UITicket = EnrichedTicket & { ownerColorClass?: string };

export type UseInboxProps = {
  user: User;
  initialTickets: EnrichedTicket[];
  initialTemplates: DbTableRow<'email_templates'>[];
  initialUnreadCount: number;
  initialSentCount: number;
  initialSelectedTicket: EnrichedTicket | null;
  initialSelectedTicketBody: string | null;
  teamMembers: TeamMemberWithProfile[];
  allTeamContacts: DbTableRow<'contacts'>[];
  t: (key: string, values?: Record<string, string | number | Date>) => string;
};

export function useInbox({
  user,
  initialTickets,
  initialUnreadCount,
  initialSentCount,
  initialSelectedTicket,
  initialSelectedTicketBody,
  teamMembers,
  t
}: UseInboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [tickets, setTickets] = useState<EnrichedTicket[]>(initialTickets || []);
  const [selectedTicket, setSelectedTicket] = useState<EnrichedTicket | null>(initialSelectedTicket);
  const [ticketToDelete, setTicketToDelete] = useState<EnrichedTicket | null>(null);
  const [activeFilter, setActiveFilter] = useState<TicketFilter>('rebuts');
  const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeInitialData | null }>({ open: false, initialData: null });
  const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(initialSelectedTicketBody);
  const [isBodyLoading, setIsBodyLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialTickets.length > 0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<string>(user.id);

  const counts = useMemo(() => ({
    unread: tickets.filter(t => (t.type === 'rebut' || !t.type) && t.status !== 'Llegit').length,
    received: initialUnreadCount,
    sent: initialSentCount,
  }), [tickets, initialUnreadCount, initialSentCount]);

  const filteredTickets = useMemo(() => {
    let displayTickets = tickets;
    // La llista 'tickets' que ve del servidor ja està filtrada per 'inboxFilter',
    // però si l'usuari selecciona "Totes les bústies", el servidor retorna tot.
    // Aquesta lògica de client ens permet canviar entre safates visualment sense
    // anar sempre al servidor si ja tenim les dades.
    if (inboxFilter !== 'all') {
      displayTickets = displayTickets.filter(t => t.user_id === inboxFilter);
    }
    // Apliquem els filtres d'estat
    if (activeFilter === 'rebuts') return displayTickets.filter(t => t.type === 'rebut' || !t.type);
    if (activeFilter === 'enviats') return displayTickets.filter(t => t.type === 'enviat');
    if (activeFilter === 'noLlegits') return displayTickets.filter(t => (t.type === 'rebut' || !t.type) && t.status !== 'Llegit');
    return displayTickets;
  }, [tickets, activeFilter, inboxFilter]);

  const enrichedAndFilteredTickets: UITicket[] = useMemo(() => {
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
        ownerColorClass: ticket.user_id ? colors[index % colors.length] : 'border-transparent'
      };
    });
  }, [filteredTickets, teamMembers]);
  // ✅ PAS CLAU: AFEGEIX AQUEST NOU BLOC DE CODI
  // Aquest efecte s'executarà només una vegada quan l'inbox es carregui per primer cop.
  useEffect(() => {
    // 1. Llegim el 'ticketId' de la URL.
    const ticketIdFromUrl = searchParams.get('ticketId');

    // 2. Si existeix...
    if (ticketIdFromUrl) {
      // ...busquem el tiquet corresponent a la llista inicial de dades.
      const ticketToSelect = initialTickets.find(
        (ticket) => ticket.id !== null && ticket.id !== undefined && ticket.id.toString() === ticketIdFromUrl
      );

      // 3. Si l'hem trobat, el seleccionem utilitzant la teva pròpia funció.
      //    Això és important per reutilitzar tota la teva lògica de càrrega del cos del missatge.
      if (ticketToSelect) {
        handleSelectTicket(ticketToSelect);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // L'array de dependències buit assegura que només s'executa un cop.

  // useEffect unificat per a la càrrega de dades.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchTerm) {
      params.set('q', debouncedSearchTerm);
    } else {
      params.delete('q');
    }
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);

    // Tota la lògica de càrrega s'embolcalla en startTransition.
    // 'isPending' serà 'true' fins que l'operació asíncrona acabi.
    startTransition(async () => {
      const results = await getTicketsAction(1, activeFilter, inboxFilter, debouncedSearchTerm);
      setTickets(results);
      setHasMore(results.length > 0);
      setPage(2); // Resetejem la paginació per a cada nova cerca/filtre.
    });
  }, [debouncedSearchTerm, activeFilter, inboxFilter, pathname, searchParams]);

  const handleSelectTicket = useCallback(async (ticket: EnrichedTicket | null) => {
    if (!ticket || !ticket.id) {
      setSelectedTicket(null);
      setSelectedTicketBody(null);
      return;
    }
    if (selectedTicket?.id === ticket.id) return;
    setSelectedTicket(ticket);
    setIsBodyLoading(true);
    setSelectedTicketBody(null);
    try {
      const { body } = await getTicketBodyAction(ticket.id);
      setSelectedTicketBody(body);
    } catch (error) {
      console.error("Error en carregar el cos del tiquet:", error);
      setSelectedTicketBody(`<p>${t('errorLoadingBody')}</p>`);
    } finally {
      setIsBodyLoading(false);
    }
    if (ticket.status !== 'Llegit') {
      setTickets(currentTickets =>
        currentTickets.map(t =>
          t.id === ticket.id ? { ...t, status: 'Llegit' as const } : t
        )
      );
      await markTicketAsReadAction(ticket.id);
    }
  }, [selectedTicket?.id, t]);

  const handleDeleteTicket = useCallback(() => {
    if (!ticketToDelete || ticketToDelete.id === null) return;
    startTransition(async () => {
      const result = await deleteTicketAction(ticketToDelete.id!);
      if (result.success) {
        toast.success(t('toast.success'), { description: result.message });
        setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
        if (selectedTicket?.id === ticketToDelete.id) {
          setSelectedTicket(null);
          setSelectedTicketBody(null);
        }
        setTicketToDelete(null);
      } else {
        toast.error(t('toast.error'), { description: result.message });
      }
    });
  }, [ticketToDelete, selectedTicket?.id, t]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isPending) return;
    startTransition(async () => {
      const results = await getTicketsAction(page, activeFilter, inboxFilter, debouncedSearchTerm);
      if (results.length > 0) {
        setTickets(p => [...p, ...results]);
        setPage(p => p + 1);
      } else {
        setHasMore(false);
      }
    });
  }, [page, activeFilter, inboxFilter, debouncedSearchTerm, hasMore, isPending]);

  const handleSaveContact = useCallback((newlyCreatedContact: DbTableRow<'contacts'>, originalTicket: EnrichedTicket) => {
    startTransition(async () => {
      if (!originalTicket.sender_email) {
        toast.error("El tiquet no té un email de remitent per vincular.");
        return;
      }
      const result = await linkTicketsToContactAction(newlyCreatedContact.id, originalTicket.sender_email);
      toast[result.success ? 'success' : 'error'](result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }, [router]);

  const handleComposeNew = useCallback(() => setComposeState({ open: true, initialData: null }), []);

  const handleReply = useCallback((ticket: EnrichedTicket) => {
    const date = ticket.sent_at ? new Date(ticket.sent_at).toLocaleString("ca-ES") : new Date().toLocaleString("ca-ES");
    const name = ticket.contact_nom || ticket.sender_name || "";
    const quotedBody = `<br><br><p>${t("replyHeader", { date, name })}</p><blockquote>${selectedTicketBody ?? ""}</blockquote>`;
    setComposeState({
      open: true,
      initialData: {
        contactId: ticket.contact_id ? String(ticket.contact_id) : undefined,
        to: ticket.contact_email ?? ticket.sender_email ?? "",
        subject: `Re: ${ticket.subject}`,
        body: quotedBody,
      },
    });
  }, [selectedTicketBody, t]);

  const handleRefresh = useCallback(() => {
    startTransition(() => { router.refresh(); });
  }, [router]);

  return {
    selectedTicket, ticketToDelete, activeFilter, composeState, selectedTicketBody,
    isBodyLoading, hasMore, searchTerm,
    isPending: isPending,
    isContactPanelOpen, inboxFilter,
    counts,
    enrichedTickets: enrichedAndFilteredTickets,
    setTicketToDelete, setActiveFilter, setComposeState, setSearchTerm,
    setIsContactPanelOpen, setInboxFilter, handleSelectTicket, handleDeleteTicket,
    handleLoadMore, handleSaveContact, handleComposeNew, handleReply, handleRefresh,
  };
}