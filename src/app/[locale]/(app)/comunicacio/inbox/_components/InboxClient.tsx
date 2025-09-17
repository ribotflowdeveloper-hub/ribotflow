"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useTransition,
  useCallback,
} from "react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  deleteTicketAction,
  markTicketAsReadAction,
  saveSenderAsContactAction,
  getTicketBodyAction,
  loadMoreTicketsAction,
  loadAllTicketsAction,
} from "../actions";
import type { Ticket, Template, TicketFilter } from "@/types/comunicacio/inbox";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Reply, Info, UserPlus } from "lucide-react";
import DOMPurify from "dompurify";

import { TicketList } from "./TicketList";
import { TicketDetail } from "./TicketDetail";
import { ContactPanel } from "./ContactPanel";
import { ComposeDialog } from "./ComposeDialog";

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
  const t = useTranslations("InboxPage");

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets || []);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [templates] = useState<Template[]>(initialTemplates || []);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Estat del filtre; 'tots' carrega onlyFirstPage per default, si l'usuari vol tot fem loadAllTicketsAction
  const [activeFilter, setActiveFilter] = useState<TicketFilter>("tots");

  const [composeState, setComposeState] = useState<{ open: boolean; initialData: any | null; }>({ open: false, initialData: null });
  const [isPending, startTransition] = useTransition();
  const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(null);
  const [isBodyLoading, setIsBodyLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialTickets.length > 0);

  // Cerca with debounce
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearchTerm) params.set("q", debouncedSearchTerm);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearchTerm, pathname, router, searchParams]);

  // Comptadors (local view based on loaded tickets; totalReceived/sent come from server initial props)
  const counts = useMemo(() => {
    const unread = tickets.filter(t => (t.type === "rebut" || !t.type) && t.status === "Obert").length;
    const received = tickets.filter(t => t.type === "rebut" || !t.type).length;
    const sent = tickets.filter(t => t.type === "enviat").length;
    return { unread, received, sent, total: tickets.length };
  }, [tickets]);

  // Filtered tickets according to activeFilter
  const filteredTickets = useMemo(() => {
    switch (activeFilter) {
      case "tots": return tickets;
      case "rebuts": return tickets.filter(t => t.type === "rebut" || !t.type);
      case "noLlegits": return tickets.filter(t => (t.type === "rebut" || !t.type) && t.status === "Obert");
      case "enviats": return tickets.filter(t => t.type === "enviat");
      default: return tickets;
    }
  }, [tickets, activeFilter]);

  // Helper: timeout wrapper for server action call
  const withTimeout = async <T,>(promise: Promise<T>, ms = 8000, fallback: T): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((res) => setTimeout(() => res(fallback), ms))
    ]);
  };

  // Select ticket and fetch body with timeout
  const handleSelectTicket = useCallback(async (ticket: Ticket) => {
    if (selectedTicket?.id === ticket.id) return;
    setSelectedTicket(ticket);
    setIsBodyLoading(true);
    setSelectedTicketBody(null);

    try {
      // Timeout de 8s: si getTicketBodyAction no respon, tornem fallback
      const { body } = await withTimeout(getTicketBodyAction(ticket.id), 8000, { body: "<p>Error: Timeout carregant el cos.</p>" });
      setSelectedTicketBody(body ?? "<p>(Sense contingut)</p>");
    } catch (e) {
      console.error("Error fetching body:", e);
      setSelectedTicketBody("<p>Error carregant el cos.</p>");
    } finally {
      setIsBodyLoading(false);
    }

    if (ticket.status === "Obert") {
      setTickets(cur => cur.map(t => t.id === ticket.id ? { ...t, status: "Llegit" } : t));
      markTicketAsReadAction(ticket.id);
    }
  }, [selectedTicket?.id]);

  // auto select first on desktop
  useEffect(() => {
    if (isDesktop && !selectedTicket && filteredTickets.length > 0) {
      handleSelectTicket(filteredTickets[0]);
    } else if (!isDesktop) {
      setSelectedTicket(null);
    }
  }, [isDesktop, filteredTickets, selectedTicket, handleSelectTicket]);

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

  // Load ALL tickets (no limit) - triggered when user explicitly wants 'Tots' full load
  const handleLoadAll = useCallback(() => {
    startTransition(async () => {
      // call server action loadAllTicketsAction
      const effectiveFilter = activeFilter === "noLlegits" ? "rebuts" : activeFilter;
      const all = await loadAllTicketsAction(effectiveFilter as TicketFilter);
      setTickets(all);
      setHasMore(false);
      setPage(2);
    });
  }, [activeFilter]);

  // When user changes filter via TicketList, we need to update state and maybe fetch
  const handleSetFilter = useCallback((filter: TicketFilter) => {
    setActiveFilter(filter);

    // reset pagination state and load initial page depending on filter
    setPage(2);
    setHasMore(true);

    // If switch to 'tots' we keep current loaded subset but user can click 'Carrega tots' (handleLoadAll)
    // Optionally, we can auto-load first page of matching filter (server already returned initial 50).
    // If user wants immediate full load, call handleLoadAll()
  }, []);

  // Delete ticket
  const handleDeleteTicket = useCallback(() => {
    if (!ticketToDelete) return;
    startTransition(async () => {
      const result = await deleteTicketAction(ticketToDelete.id);
      if (result.success) {
        toast.success("Èxit!", { description: result.message });
        setTickets(p => p.filter(t => t.id !== ticketToDelete.id));
        setTicketToDelete(null);
      } else {
        toast.error("Error", { description: result.message });
      }
    });
  }, [ticketToDelete]);

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

  // sanitize helper
  const safeHTML = (html: string | null | undefined) => DOMPurify.sanitize(html ?? "<p>(Sense contingut)</p>");

  // Layout components
  const DesktopLayout = () => (
    <div className="flex flex-row h-full w-full">
      <TicketList
        tickets={filteredTickets}
        selectedTicketId={selectedTicket?.id ?? null}
        activeFilter={activeFilter}
        unreadCount={counts.unread}
        sentCount={counts.sent}
        totalCount={counts.total}
        onSetFilter={(f) => {
          handleSetFilter(f);
          // if user clicked "tots" and expects ALL, we call handleLoadAll()
          if (f === "tots") {
            // If currently tickets length is less than server total we can ask to load all
            // We prefer explicit loadAll to avoid accidental huge fetch. If you want auto, uncomment:
            // handleLoadAll();
          }
        }}
        onDeleteTicket={setTicketToDelete}
        onSelectTicket={handleSelectTicket}
        onComposeNew={handleComposeNew}
        onRefresh={handleRefresh}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onLoadAll={handleLoadAll} // optional prop for a "Load all" button
        isPendingRefresh={isPending as unknown as boolean}
      />
      <TicketDetail
        ticket={selectedTicket}
        body={selectedTicketBody}
        isLoading={isBodyLoading}
        onReply={handleReply}
      />
      <ContactPanel
        ticket={selectedTicket}
        onSaveContact={handleSaveContact}
        isPendingSave={isPending as unknown as boolean}
      />
    </div>
  );

  const MobileLayout = () => (
    <div className="flex h-full w-full overflow-hidden relative">
      <div className={`w-full flex-col ${selectedTicket ? "hidden" : "flex"}`}>
        <TicketList
          tickets={filteredTickets}
          selectedTicketId={selectedTicket?.id ?? null}
          activeFilter={activeFilter}
          unreadCount={counts.unread}
          sentCount={counts.sent}
          totalCount={counts.total}
          onSetFilter={(f) => {
            handleSetFilter(f);
            if (f === "tots") {
              // optional
            }
          }}
          onDeleteTicket={setTicketToDelete}
          onSelectTicket={handleSelectTicket}
          onComposeNew={handleComposeNew}
          onRefresh={handleRefresh}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onLoadAll={handleLoadAll}
          isPendingRefresh={isPending as unknown as boolean}
        />
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            key={selectedTicket.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="absolute inset-0 flex flex-col bg-background z-10"
          >
            <div className="p-2 border-b flex justify-between items-center">
              <div className="flex items-center min-w-0">
                <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="ml-2 truncate">
                  <p className="font-semibold truncate">{selectedTicket.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedTicket.contacts?.nom || selectedTicket.sender_name}
                  </p>
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={() => handleReply(selectedTicket)}>
                <Reply className="mr-2 h-4 w-4" />
                {t("replyButton")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <details className="border rounded-lg p-3 mb-4 bg-muted/50">
                <summary className="cursor-pointer font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> {t("senderDetailsLabel")}
                </summary>
                <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                  <p>
                    <strong>{t("nameLabel")}</strong>{" "}
                    {selectedTicket.contacts?.nom || selectedTicket.sender_name}
                  </p>
                  <p>
                    <strong>{t("emailLabel")}</strong>{" "}
                    {selectedTicket.contacts?.email || selectedTicket.sender_email}
                  </p>
                  {!selectedTicket.contacts && (
                    <Button size="sm" className="w-full mt-2" onClick={() => handleSaveContact(selectedTicket)} disabled={isPending as unknown as boolean}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t("saveContactButton")}
                    </Button>
                  )}
                </div>
              </details>

              <div
                className="prose-email max-w-none"
                dangerouslySetInnerHTML={{ __html: safeHTML(selectedTicket.body ?? selectedTicketBody) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="h-full w-full">
      <ComposeDialog
        open={composeState.open}
        onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })}
        onEmailSent={() => router.refresh()}
        initialData={composeState.initialData}
        templates={templates}
      />
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending as unknown as boolean}>{t("cancelButton")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket} disabled={isPending as unknown as boolean}>
              {t("confirmDeleteButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
    </div>
  );
}
