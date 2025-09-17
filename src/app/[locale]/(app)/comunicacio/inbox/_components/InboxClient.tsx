/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/_components/inbox-client.tsx
 * @summary Component principal i interactiu de la Safata d'Entrada, reestructurat i corregit.
 * Aquest component actua com a orquestrador, gestionant l'estat i la lògica.
 */

"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  deleteTicketAction,
  markTicketAsReadAction,
  saveSenderAsContactAction,
  getTicketBodyAction,
  loadMoreTicketsAction,

} from '../actions';
import type { Ticket, Template, TicketFilter } from '@/types/comunicacio/inbox';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';

// Importem els tipus i components necessaris
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TicketList } from './TicketList';
import { TicketDetail } from './TicketDetail';
import { ContactPanel } from './ContactPanel';
import { ComposeDialog, type InitialData as ComposeInitialData } from './ComposeDialog';
import { MobileDetailView } from './MobileDetailView';

export function InboxClient({
  initialTickets,
  initialTemplates,
  initialReceivedCount,
  initialSentCount,
}: {
  initialTickets: Ticket[];
  initialTemplates: Template[];
  initialReceivedCount: number;
  initialSentCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('InboxPage');

  // --- 1. ESTATS (useState) ---
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets || []);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [activeFilter, setActiveFilter] = useState<TicketFilter>('rebuts');
  const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeInitialData | null; }>({ open: false, initialData: null });
  const [isPending, startTransition] = useTransition();
  const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(null);
  const [isBodyLoading, setIsBodyLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialTickets.length > 0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // --- 2. DADES DERIVADES (useMemo) ---
  const counts = useMemo(() => ({
    unread: tickets.filter(t => (t.type === 'rebut' || !t.type) && t.status === 'Obert').length,
    received: initialReceivedCount,
    sent: initialSentCount,
  }), [tickets, initialReceivedCount, initialSentCount]);

  const filteredTickets = useMemo(() => {
    if (activeFilter === 'rebuts') return tickets.filter(t => t.type === 'rebut' || !t.type);
    if (activeFilter === 'enviats') return tickets.filter(t => t.type === 'enviat');
    if (activeFilter === 'noLlegits') return tickets.filter(t => (t.type === 'rebut' || !t.type) && t.status === 'Obert');
    return tickets;
  }, [tickets, activeFilter]);

  // --- 4. GESTORS D'ESDEVENIMENTS (useCallback) ---
  const handleSelectTicket = useCallback(async (ticket: Ticket) => {
    if (selectedTicket?.id === ticket.id && isDesktop) return;
    setSelectedTicket(ticket);
    setIsBodyLoading(true);
    setSelectedTicketBody(null);

    const { body } = await getTicketBodyAction(ticket.id);
    setSelectedTicketBody(body || `<p>(${t('noContent')})</p>`);
    setIsBodyLoading(false);

    if (ticket.status === 'Obert') {
      setTickets(current => current.map(t => t.id === ticket.id ? { ...t, status: 'Llegit' } : t));
      markTicketAsReadAction(ticket.id);
    }
  }, [selectedTicket?.id, isDesktop, t]);

  // --- 3. EFECTES SECUNDARIS (useEffect) ---
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (debouncedSearchTerm) {
      params.set('q', debouncedSearchTerm);
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearchTerm, pathname, router, searchParams]);

  useEffect(() => {
    if (isDesktop) {
      const currentSelectedExists = selectedTicket && filteredTickets.some(t => t.id === selectedTicket.id);
      if (!currentSelectedExists && filteredTickets.length > 0) {
        handleSelectTicket(filteredTickets[0]);
      }
    } else {
      setSelectedTicket(null);
    }
  }, [isDesktop, tickets, filteredTickets, selectedTicket, handleSelectTicket]);


  const handleDeleteTicket = useCallback(() => {
    if (!ticketToDelete) return;
    startTransition(async () => {
      const result = await deleteTicketAction(ticketToDelete.id);
      if (result.success) {
        toast.success(t('toast.success'), { description: result.message });
        setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
        setTicketToDelete(null);
      } else {
        toast.error(t('toast.error'), { description: result.message });
      }
    });
  }, [ticketToDelete, t]);

  // Load more (pagination)
  const handleLoadMore = useCallback(() => {
    startTransition(async () => {
      // map 'noLlegits' to 'rebuts' for server paging
      const effectiveFilter = activeFilter === "noLlegits" ? "rebuts" : activeFilter;
      const newTickets = await loadMoreTicketsAction(page, effectiveFilter as TicketFilter);
      if (newTickets.length) {
        setTickets(p => [...p, ...newTickets]);
        setPage(p => p + 1);
      } else {
        setHasMore(false);
      }
    });
  }, [page, activeFilter]);


  // Save contact
  const handleSaveContact = useCallback((ticket: Ticket) => {
    startTransition(async () => {
      const result = await saveSenderAsContactAction(ticket);
      if (result.success) {
        toast.success("Èxit!", { description: result.message });
        router.refresh();
      } else {
        toast.error("Error", { description: result.message });
      }
    });
  }, [router]);

  const handleComposeNew = useCallback(() => setComposeState({ open: true, initialData: null }), []);
  const handleReply = useCallback((ticket: Ticket) => {
    const date = new Date(ticket.sent_at).toLocaleString("ca-ES");
    const name = ticket.contacts?.nom || ticket.sender_name || "";
    const quotedBody = `<br><br><p>${t("replyHeader", { date, name })}</p><blockquote>${ticket.body ?? selectedTicketBody ?? ""}</blockquote>`;
    setComposeState({
      open: true,
      initialData: {
        contactId: ticket.contact_id ?? "",
        to: ticket.contacts?.email ?? ticket.sender_email ?? "",
        subject: `Re: ${ticket.subject}`,
        body: quotedBody,
      },
    });
  }, [selectedTicketBody, t]);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      toast.info(t("inboxUpdatedToast"));
    });
  }, [router, t]);



  // --- 5. RENDERITZAT ---
  const DesktopLayout = () => (
    <div className="flex flex-row h-full w-full">
      <TicketList
        tickets={filteredTickets}
        selectedTicketId={selectedTicket?.id ?? null}
        activeFilter={activeFilter}
        unreadCount={counts.unread}
        sentCount={counts.sent}
        totalCount={counts.received}
        onSetFilter={setActiveFilter}
        onDeleteTicket={setTicketToDelete}
        onSelectTicket={handleSelectTicket}
        onComposeNew={handleComposeNew}
        onRefresh={handleRefresh}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onLoadAll={() => {}} // Aquesta funció es pot implementar en el futur
        isPendingRefresh={isPending}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <TicketDetail ticket={selectedTicket} body={selectedTicketBody} isLoading={isBodyLoading} onReply={handleReply} />
      <ContactPanel ticket={selectedTicket} onSaveContact={handleSaveContact} isPendingSave={isPending} />
    </div>
  );

  const MobileAndTabletLayout = () => (
    <div className="flex h-full w-full overflow-hidden relative">
      <div className={`w-full flex-col flex-shrink-0 ${selectedTicket ? 'hidden' : 'flex'}`}>
        <TicketList
          tickets={filteredTickets}
          selectedTicketId={null}
          activeFilter={activeFilter}
          unreadCount={counts.unread}
          sentCount={counts.sent}
          totalCount={counts.received}
          onSetFilter={setActiveFilter}
          onDeleteTicket={setTicketToDelete}
          onSelectTicket={handleSelectTicket}
          onComposeNew={handleComposeNew}
          onRefresh={handleRefresh}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onLoadAll={() => {}}
          isPendingRefresh={isPending}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>
      <AnimatePresence>
        {selectedTicket && (
          <MobileDetailView
            ticket={selectedTicket}
            body={selectedTicketBody}
            isLoading={isBodyLoading}
            isPending={isPending}
            onClose={() => setSelectedTicket(null)}
            onReply={handleReply}
            onSaveContact={handleSaveContact}
          />
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="h-full w-full">
      <ComposeDialog open={composeState.open} onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })} onEmailSent={() => router.refresh()} initialData={composeState.initialData} templates={initialTemplates} />
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancelButton")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket} disabled={isPending}>{t("confirmDeleteButton")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="h-full w-full">
        {isDesktop ? <DesktopLayout /> : <MobileAndTabletLayout />}
      </div>
    </div>
  );
}