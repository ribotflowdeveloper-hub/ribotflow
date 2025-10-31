// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useInbox.ts
import { useCallback, useState, useTransition } from "react"; // ✅ 1. Importem useState
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import type {
  DbTableRow,
  EnrichedTicket,
  TeamMemberWithProfile,
} from "@/types/db";

// ✅ 2. Importem la nova acció
import {
  deleteMultipleTicketsAction,
  deleteTicketAction,
  linkTicketsToContactAction,
} from "../actions";
import { useInboxStateAndFilters } from "./useInboxStateAndFilter";
import { useTicketData } from "./useTicketData";
import { useURLSync } from "./useURLSync";
import { useInboxComputed } from "./useInboxComputed";

// ✅ Mantenim el tipus original, però ara algunes props seran ignorades a favor de la lògica interna
export type UseInboxProps = {
  user: User;
  initialTickets: EnrichedTicket[];
  initialTemplates: DbTableRow<"email_templates">[];
  initialUnreadCount: number;
  initialSentCount: number;
  teamMembers: TeamMemberWithProfile[];
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  // Les props `initialSelectedTicket` i `initialSelectedTicketBody` ja no són necessàries aquí
};

export function useInbox({
  user,
  initialTickets,
  initialUnreadCount,
  initialSentCount,
  teamMembers,
  t,
}: UseInboxProps) {
  const router = useRouter();
  const [isActionPending, startActionTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const {
    selectedTicket,
    setSelectedTicket,
    ticketToDelete,
    setTicketToDelete,
    activeFilter,
    setActiveFilter,
    composeState,
    setComposeState,
    isContactPanelOpen,
    setIsContactPanelOpen,
    inboxFilter,
    setInboxFilter,
    searchTerm,
    setSearchTerm,
  } = useInboxStateAndFilters(user);

  const onTicketSelectedCallback = useCallback((ticket: EnrichedTicket) => {
    setSelectedTicket(ticket);
  }, [setSelectedTicket]);

  const onTicketDeselectedCallback = useCallback(() => {
    setSelectedTicket(null);
  }, [setSelectedTicket]);

  const {
    isPending: isDataPending,
    tickets,
    setTickets,
    selectedTicketBody,
    isBodyLoading,
    hasMore,
    debouncedSearchTerm,
    handleSelectTicket: performSelectTicket,
    fetchAndSelectTicket, // ✅ Rebem la funció des de useTicketData

    handleLoadMore,
  } = useTicketData({
    initialTickets,
    activeFilter,
    inboxFilter,
    searchTerm,
    onTicketSelected: onTicketSelectedCallback,
    onTicketDeselected: onTicketDeselectedCallback,
  });

  const handleSelectTicket = useCallback((ticket: EnrichedTicket | null) => {
    performSelectTicket(ticket, selectedTicket?.id);
  }, [performSelectTicket, selectedTicket?.id]);

  useURLSync({
    selectedTicket,
    debouncedSearchTerm,
    initialTickets,
    onSelectTicketFromURL: handleSelectTicket,
    onFetchAndSelectTicket: fetchAndSelectTicket,
  });

  const { enrichedTickets, counts } = useInboxComputed({
    tickets,
    activeFilter,
    inboxFilter,
    teamMembers,
    initialUnreadCount,
    initialSentCount,
  });

  // Aquesta funció ja actualitza l'estat local (setTickets), per això ja s'animarà
  const handleDeleteTicket = useCallback(() => {
    if (!ticketToDelete) return;
    startActionTransition(async () => {
      const result = await deleteTicketAction(ticketToDelete.id!);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) {
        setTickets((prev) => prev.filter((t) => t.id !== ticketToDelete.id)); // <-- Correcte
        if (selectedTicket?.id === ticketToDelete.id) {
          handleSelectTicket(null);
        }
        setTicketToDelete(null);
      }
    });
  }, [
    ticketToDelete,
    selectedTicket,
    handleSelectTicket,
    setTickets,
    setTicketToDelete,
  ]);

  const handleSaveContact = useCallback(
    (
      newlyCreatedContact: DbTableRow<"contacts">,
      originalTicket: EnrichedTicket,
    ) => {
      startActionTransition(async () => {
        if (!originalTicket.sender_email) {
          toast.error("El tiquet no té un email de remitent per vincular.");
          return;
        }
        const result = await linkTicketsToContactAction(
          newlyCreatedContact.id,
          originalTicket.sender_email,
        );
        toast[result.success ? "success" : "error"](result.message);
        if (result.success) {
          router.refresh();
        }
      });
    },
    [router],
  );

  const handleComposeNew = useCallback(
    () => setComposeState({ open: true, initialData: null }),
    [setComposeState],
  );

  const handleReply = useCallback((ticket: EnrichedTicket) => {
    const date = ticket.sent_at
      ? new Date(ticket.sent_at).toLocaleString("ca-ES")
      : new Date().toLocaleString("ca-ES");
    const name = ticket.contact_nom || ticket.sender_name || "";
    const quotedBody = `<br><br><p>${
      t("replyHeader", { date, name })
    }</p><blockquote>${selectedTicketBody ?? ""}</blockquote>`;
    setComposeState({
      open: true,
      initialData: {
        contactId: ticket.contact_id ? String(ticket.contact_id) : undefined,
        to: ticket.contact_email ?? ticket.sender_email ?? "",
        subject: `Re: ${ticket.subject}`,
        body: quotedBody,
      },
    });
  }, [selectedTicketBody, t, setComposeState]);

  const handleRefresh = useCallback(() => {
    startActionTransition(() => {
      router.refresh();
    });
  }, [router]);
  // --- LÒGICA DE SELECCIÓ MÚLTIPLE ---
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(
    new Set(),
  );

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      const newMode = !prev;
      if (!newMode) {
        setSelectedTicketIds(new Set());
      }
      return newMode;
    });
  }, []);

  const handleToggleSelection = useCallback((ticketId: number) => {
    setSelectedTicketIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  }, []);

  // ✅ --- CANVI PRINCIPAL AQUÍ ---
  /**
   * Crida la Server Action per esborrar els tiquets seleccionats
   * i actualitza l'estat local.
   */
  const handleDeleteSelected = useCallback(() => {
    if (selectedTicketIds.size === 0) return;

    if (
      !confirm(t("deleteMultipleConfirm", { count: selectedTicketIds.size }))
    ) {
      return;
    }

    startDeleteTransition(async () => {
      const ids = Array.from(selectedTicketIds);
      const result = await deleteMultipleTicketsAction(ids);

      if (result.success) {
        toast.success(result.message || t("deleteMultipleSuccess"));

        // ✅ 1. ACTUALITZEM L'ESTAT LOCAL (en lloc de handleRefresh)
        setTickets((prev) => prev.filter((t) => !selectedTicketIds.has(t.id!)));

        // 2. Comprovem si el tiquet obert estava entre els esborrats
        if (selectedTicket && selectedTicketIds.has(selectedTicket.id!)) {
          handleSelectTicket(null); // Tanquem el panell de detall
        }

        // 3. Resetejem l'estat de selecció
        setSelectedTicketIds(new Set());
        setIsSelectionMode(false);

        // ❌ JA NO CAL: handleRefresh();
      } else {
        toast.error(result.message || t("deleteMultipleError"));
      }
    });
    // ✅ Afegim les dependències necessàries
  }, [selectedTicketIds, t, setTickets, selectedTicket, handleSelectTicket]);

  return {
    selectedTicket,
    ticketToDelete,
    activeFilter,
    composeState,
    selectedTicketBody,
    isBodyLoading,
    hasMore,
    searchTerm,
    isPending: isDataPending || isActionPending || isDeleting,
    isContactPanelOpen,
    inboxFilter,
    counts,
    enrichedTickets,
    setTicketToDelete,
    setActiveFilter,
    setComposeState,
    setSearchTerm,
    setIsContactPanelOpen,
    setInboxFilter,
    handleSelectTicket,
    handleDeleteTicket,
    handleLoadMore,
    handleSaveContact,
    handleComposeNew,
    handleReply,
    handleRefresh,

    // --- Nous valors retornats (sense canvis) ---
    isSelectionMode,
    selectedTicketIds,
    onToggleSelectionMode: handleToggleSelectionMode,
    onToggleSelection: handleToggleSelection,
    onDeleteSelected: handleDeleteSelected,
  };
}
