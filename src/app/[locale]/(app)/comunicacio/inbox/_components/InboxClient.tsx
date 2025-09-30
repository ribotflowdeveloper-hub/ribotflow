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
import { type Contact } from '@/types/crm'; // Assegura't d'importar el tipus Contact

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
import type { User } from '@supabase/supabase-js'; // Importem el tipus User

// ✅ PAS 1: Definim el tipus per als membres de l'equip que rebrem.
type TeamMember = {
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};
type Permission = { target_user_id: string };

export function InboxClient({
  user, // ✅ NOU: Rebem l'objecte de l'usuari actual
  initialTickets,
  initialTemplates,
  initialReceivedCount,
  initialSentCount,
  initialSelectedTicket,
  initialSelectedTicketBody,
  teamMembers, // ✅ PAS 2: Acceptem la nova prop amb la llista de membres.
  permissions,
  allTeamContacts, // ✅ Acceptem la nova prop


}: {
  user: User; // ✅ Prop tipada
  initialTickets: Ticket[];
  initialTemplates: Template[];
  initialReceivedCount: number;
  initialSentCount: number;
  initialSelectedTicket: Ticket | null;
  initialSelectedTicketBody: string | null;
  teamMembers: TeamMember[]; // ✅ Prop tipada.
  permissions: Permission[]; // ✅ Prop tipada
  allTeamContacts: Contact[]; // ✅ Prop tipada

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
  // ✅ CANVI: El panell de contacte comença tancat
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false); const isDesktop = useMediaQuery('(min-width: 1024px)');
  // ✅ NOU: Estat per al filtre de la bústia. 'all' mostra tot, un ID mostra només els d'aquell usuari.
  const [inboxFilter, setInboxFilter] = useState<string>('all');

  const counts = useMemo(() => ({
    unread: tickets.filter(t => (t.type === 'rebut' || !t.type) && t.status === 'NoLlegit').length,
    received: initialReceivedCount,
    sent: initialSentCount,
  }), [tickets, initialReceivedCount, initialSentCount]);
  
  // ✅ LÒGICA CLAU: Aquest bloc és el que faltava o s'havia perdut.
  // S'encarrega d'agafar els tiquets filtrats i afegir la informació del propietari a cada un.
  const filteredTickets = useMemo(() => {
    // ... (la teva lògica de filtratge per 'activeFilter' i 'inboxFilter' va aquí)
    let displayTickets = tickets;
    if (inboxFilter !== 'all') {
      displayTickets = displayTickets.filter(t => t.user_id === inboxFilter);
    }
    if (activeFilter === 'rebuts') return displayTickets.filter(t => t.type === 'rebut' || !t.type);
    if (activeFilter === 'enviats') return displayTickets.filter(t => t.type === 'enviat');
    if (activeFilter === 'noLlegits') return displayTickets.filter(t => (t.type === 'rebut' || !t.type) && t.status === 'NoLlegit');
    return displayTickets;
  }, [tickets, activeFilter, inboxFilter]);



  const userColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const colors = ['border-blue-500', 'border-green-500', 'border-yellow-500', 'border-purple-500', 'border-pink-500', 'border-indigo-500'];
    teamMembers.forEach((member, index) => {
      if (member.profiles?.id) {
        map.set(member.profiles.id, colors[index % colors.length]);
      }
    });
    return map;
  }, [teamMembers]);
  // Enrichim els tiquets amb la informació del seu propietari.
  const enrichedTickets = useMemo(() => {
    return filteredTickets.map(ticket => {
      const owner = teamMembers.find(m => m.profiles?.id === ticket.user_id)?.profiles;
      return {
        ...ticket,
        owner,
        ownerColorClass: owner ? userColorMap.get(owner.id) : 'border-transparent',
      };
    });
  }, [filteredTickets, teamMembers, userColorMap]);

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

    if (ticket.status === 'NoLlegit') {
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
  // ✅ AFEGEIX AQUEST CONSOLE.LOG JUST ABANS DEL RETURN
  console.log(
    `[InboxClient] Estat actual -> Panell Obert: ${isContactPanelOpen}, Tiquet Seleccionat:`,
    selectedTicket ? selectedTicket.subject : null
  );
  return (
    <>
      <ComposeDialog
        open={composeState.open}
        onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })}
        onEmailSent={() => router.refresh()}
        initialData={composeState.initialData}
        templates={initialTemplates}
        contacts={allTeamContacts} // ✅ PASSA AQUÍ LA LLISTA DE CONTACTES
      />      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>{t("cancelButton")}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTicket} disabled={isPending}>{t("confirmDeleteButton")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className="h-[calc(100vh-var(--header-height,64px))] w-full grid transition-all duration-300 ease-in-out"
        // ✅ CANVI: El panell de contacte ara s'adapta a l'espai
        style={{ gridTemplateColumns: isDesktop ? `384px 1fr minmax(0, ${isContactPanelOpen ? '320px' : '0px'})` : '1fr' }}
      >
        {(!isDesktop && selectedTicket) ? null : (
          <div className="min-h-0">
            <TicketList
              user={user} // Passem l'usuari actual
              teamMembers={teamMembers} // Passem els membres de l'equip
              permissions={permissions} // ✅ Passem els permisos a TicketList
              tickets={enrichedTickets}
              selectedTicketId={selectedTicket?.id ?? null}
              activeFilter={activeFilter}
              inboxFilter={inboxFilter} // Passem el filtre de bústia actual
              onSetInboxFilter={setInboxFilter} // Passem la funció per a canviar-lo
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
              isPendingRefresh={isPending}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        )}

        {/* La resta del teu JSX es manté igual */}
        {isDesktop && (
          <div className="min-h-0">
            <TicketDetail
              ticket={selectedTicket} body={selectedTicketBody} isLoading={isBodyLoading} onReply={handleReply}
              isContactPanelOpen={isContactPanelOpen}
              onToggleContactPanel={() => setIsContactPanelOpen(prev => !prev)}
            />
          </div>
        )}
        {/* ✅ CORRECCIÓ CLAU: Ens assegurem de passar 'allTeamContacts' al ContactPanel */}
        {isDesktop && isContactPanelOpen && (
          <div className="overflow-hidden min-h-0">
            <ContactPanel
              ticket={selectedTicket}
              onSaveContact={handleSaveContact}
              isPendingSave={isPending}
              allTeamContacts={allTeamContacts}
            />
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