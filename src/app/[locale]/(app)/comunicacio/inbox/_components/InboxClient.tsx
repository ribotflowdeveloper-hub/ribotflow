/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/_components/inbox-client.tsx
 */
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTranslations } from 'next-intl';
import { useDebounce } from 'use-debounce';

import {
  deleteTicketAction,
  markTicketAsReadAction,
  saveSenderAsContactAction,
  getTicketBodyAction,
  loadMoreTicketsAction,
} from '../actions';
import type { Ticket, Template, TicketFilter } from '@/types/comunicacio/inbox';

// Components
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
  initialSelectedTicket,
  initialSelectedTicketBody,
}: {
  initialTickets: Ticket[];
  initialTemplates: Template[];
  initialReceivedCount: number;
  initialSentCount: number;
  initialSelectedTicket: Ticket | null;
  initialSelectedTicketBody: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('InboxPage');

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets || []);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(initialSelectedTicket);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [activeFilter, setActiveFilter] = useState<TicketFilter>('rebuts');

  const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeInitialData | null; }>({ open: false, initialData: null });
  const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(initialSelectedTicketBody);
  const [isBodyLoading, setIsBodyLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialTickets.length > 0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [isPending, startTransition] = useTransition();
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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

  const handleSelectTicket = async (ticket: Ticket) => {
    if (selectedTicket?.id === ticket.id) return;

    setSelectedTicket(ticket);
    setIsBodyLoading(true);
    setSelectedTicketBody(null);

    try {
      const { body } = await getTicketBodyAction(ticket.id);
      setSelectedTicketBody(body);
    } catch { // ✅ CORRECCIÓ DEFINITIVA: Eliminem la variable no utilitzada.
      setSelectedTicketBody(`<p>${t('errorLoadingBody')}</p>`);
    } finally {
      setIsBodyLoading(false);
    }

    if (ticket.status === 'Obert') {
      markTicketAsReadAction(ticket.id);
      setTickets(current => current.map(t => t.id === ticket.id ? { ...t, status: 'Llegit' } : t));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);
    else params.delete('q');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }, [debouncedSearchTerm, pathname, router, searchParams]);

  const handleDeleteTicket = useCallback(() => {
    if (!ticketToDelete) return;
    startTransition(async () => {
      const result = await deleteTicketAction(ticketToDelete.id);
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
  }, [ticketToDelete, t, selectedTicket?.id]);

  const handleLoadMore = useCallback(() => {
    startTransition(async () => {
      const effectiveFilter = activeFilter === "noLlegits" ? "rebuts" : activeFilter;
      const newTickets = await loadMoreTicketsAction(page, effectiveFilter);
      if (newTickets.length) {
        setTickets(p => [...p, ...newTickets]);
        setPage(p => p + 1);
      } else {
        setHasMore(false);
      }
    });
  }, [page, activeFilter]);

  const handleSaveContact = useCallback((ticket: Ticket) => {
    startTransition(async () => {
      const result = await saveSenderAsContactAction(ticket);
      if (result.success) {
        toast.success(t('toast.contactSavedSuccess'), { description: result.message });
        router.refresh();
      } else {
        toast.error(t('toast.error'), { description: result.message });
      }
    });
  }, [router, t]);

  const handleComposeNew = useCallback(() => setComposeState({ open: true, initialData: null }), []);
  
  const handleReply = useCallback((ticket: Ticket) => {
    const date = new Date(ticket.sent_at).toLocaleString("ca-ES");
    const name = ticket.contacts?.nom || ticket.sender_name || "";
    const quotedBody = `<br><br><p>${t("replyHeader", { date, name })}</p><blockquote>${selectedTicketBody ?? ""}</blockquote>`;

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

  return (
    <>
      <ComposeDialog open={composeState.open} onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })} onEmailSent={() => router.refresh()} initialData={composeState.initialData} templates={initialTemplates} />
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>{t("cancelButton")}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTicket} disabled={isPending}>{t("confirmDeleteButton")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className="h-[calc(100vh-var(--header-height,64px))] w-full grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateColumns: isDesktop ? `384px 1fr ${isContactPanelOpen ? '320px' : '0px'}` : '1fr' }}
      >
        {(!isDesktop && selectedTicket) ? null : (
          <div className="min-h-0">
            <TicketList
              tickets={filteredTickets} selectedTicketId={selectedTicket?.id ?? null} activeFilter={activeFilter}
              unreadCount={counts.unread} sentCount={counts.sent} totalCount={counts.received}
              onSetFilter={setActiveFilter} onDeleteTicket={setTicketToDelete} onSelectTicket={handleSelectTicket}
              onComposeNew={handleComposeNew} onRefresh={handleRefresh} hasMore={hasMore}
              onLoadMore={handleLoadMore} isPendingRefresh={isPending} searchTerm={searchTerm} onSearchChange={setSearchTerm}
            />
          </div>
        )}

        {isDesktop && (
          <div className="min-h-0">
            <TicketDetail
              ticket={selectedTicket} body={selectedTicketBody} isLoading={isBodyLoading} onReply={handleReply}
              isContactPanelOpen={isContactPanelOpen}
              onToggleContactPanel={() => setIsContactPanelOpen(prev => !prev)}
            />
          </div>
        )}

        {isDesktop && (
          <div className="overflow-hidden min-h-0">
            <ContactPanel ticket={selectedTicket} onSaveContact={handleSaveContact} isPendingSave={isPending} />
          </div>
        )}

        <AnimatePresence>
          {!isDesktop && selectedTicket && (
            <MobileDetailView
              ticket={selectedTicket} body={selectedTicketBody} isLoading={isBodyLoading} isPending={isPending}
              onClose={() => setSelectedTicket(null)} onReply={handleReply} onSaveContact={handleSaveContact}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

