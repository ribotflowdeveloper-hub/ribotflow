// Ubicació: /app/(app)/comunicacio/inbox/_hooks/useInbox.ts

import { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import { useDebounce } from 'use-debounce';
import type { User } from '@supabase/supabase-js';

import {
    deleteTicketAction,
    markTicketAsReadAction,
    saveSenderAsContactAction,
    getTicketBodyAction,
    loadMoreTicketsAction,
} from '../actions';
import type { Ticket, Template, TicketFilter } from '@/types/comunicacio/inbox';
import type { InitialData as ComposeInitialData } from '../_components/ComposeDialog';

// ✅ Definim un tipus clar per als membres de l'equip
type TeamMember = {
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

// Tipus per a les props que el hook necessita
type UseInboxProps = {
    user: User;
    initialTickets: Ticket[];
    initialTemplates: Template[];
    initialReceivedCount: number;
    initialSentCount: number;
    initialSelectedTicket: Ticket | null;
    initialSelectedTicketBody: string | null;
    teamMembers: TeamMember[]; // ✅ Canviem 'any[]' pel nostre tipus
    t: (key: string, values?: Record<string, string | number | Date>) => string;
};

// Funció auxiliar per a obtenir les inicials
const getInitials = (name: string | null | undefined): string => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

export function useInbox({
    user,
    initialTickets,
    initialReceivedCount,
    initialSentCount,
    initialSelectedTicket,
    initialSelectedTicketBody,
    teamMembers,
    t
}: UseInboxProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // --- ESTATS ---
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets || []);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(initialSelectedTicket);
    const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
    const [activeFilter, setActiveFilter] = useState<TicketFilter>('rebuts');
    const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeInitialData | null }>({ open: false, initialData: null });
    const [selectedTicketBody, setSelectedTicketBody] = useState<string | null>(initialSelectedTicketBody);
    const [isBodyLoading, setIsBodyLoading] = useState(false);
    const [page, setPage] = useState(2);
    const [hasMore, setHasMore] = useState(initialTickets.length > 0);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [isPending, startTransition] = useTransition();
    const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
    const [inboxFilter, setInboxFilter] = useState<string>(user.id); // Per defecte, la bústia de l'usuari
    

    // --- DADES MEMORITZADES ---
    const counts = useMemo(() => ({
        unread: tickets.filter(t => (t.type === 'rebut' || !t.type) && t.status === 'NoLlegit').length,
        received: initialReceivedCount,
        sent: initialSentCount,
    }), [tickets, initialReceivedCount, initialSentCount]);

    const filteredTickets = useMemo(() => {
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

    const enrichedTickets = useMemo(() => {
        return filteredTickets.map(ticket => {
            const ownerProfile = teamMembers.find(m => m.profiles?.id === ticket.user_id)?.profiles;
            const owner = ownerProfile ? {
                full_name: ownerProfile.full_name,
                avatar_url: ownerProfile.avatar_url,
                initials: getInitials(ownerProfile.full_name)
            } : null;
            return { ...ticket, owner, ownerColorClass: ownerProfile ? userColorMap.get(ownerProfile.id) : 'border-transparent' };
        });
    }, [filteredTickets, teamMembers, userColorMap]);

    // --- HANDLERS (FUNCIONS D'ACCIÓ) ---
    const handleSelectTicket = useCallback(async (ticket: Ticket | null) => { // ✅ Aceptamos null
        // Si el tiquet és null (p.ex. al tancar la vista mòbil), netegem l'estat
        if (!ticket) {
            setSelectedTicket(null);
            setSelectedTicketBody(null);
            return;
        }

        if (selectedTicket?.id === ticket.id) return;

        setSelectedTicket(ticket);
        // ... la resta de la funció es manté igual
        setIsBodyLoading(true);
        setSelectedTicketBody(null);
        try {
            const { body } = await getTicketBodyAction(ticket.id);
            setSelectedTicketBody(body);
        } catch {
            setSelectedTicketBody(`<p>${t('errorLoadingBody')}</p>`);
        } finally {
            setIsBodyLoading(false);
        }
        if (ticket.status === 'NoLlegit') {
            markTicketAsReadAction(ticket.id);
            setTickets(current => current.map(t => t.id === ticket.id ? { ...t, status: 'Llegit' } : t));
        }
    }, [selectedTicket?.id, t]);

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
    }, [ticketToDelete, selectedTicket?.id, t]);

    const handleLoadMore = useCallback(() => {
        startTransition(async () => {
            const effectiveFilter = activeFilter === "noLlegits" ? "rebuts" : activeFilter;
            const newTickets = await loadMoreTicketsAction(page, effectiveFilter, inboxFilter);
            if (newTickets.length > 0) {
                setTickets(p => [...p, ...newTickets]);
                setPage(p => p + 1);
            } else {
                setHasMore(false);
            }
        });
    }, [page, activeFilter, inboxFilter]);

    const handleSaveContact = useCallback((ticket: Ticket) => {
        startTransition(async () => {
            const result = await saveSenderAsContactAction(ticket);
            toast[result.success ? 'success' : 'error'](result.message);
            if (result.success) router.refresh();
        });
    }, [router]);

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

    // --- EFECTES SECUNDARIS ---
    useEffect(() => {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        if (debouncedSearchTerm) {
            params.set('q', debouncedSearchTerm);
        } else {
            params.delete('q');
        }
        startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }, [debouncedSearchTerm, pathname, router, searchParams]);

    // --- VALORS RETORNATS ---
    return {
        // Estats
        selectedTicket,
        ticketToDelete,
        activeFilter,
        composeState,
        selectedTicketBody,
        isBodyLoading,
        hasMore,
        searchTerm,
        isPending,
        isContactPanelOpen,
        inboxFilter,

        // Dades processades
        counts,
        enrichedTickets,

        // Setters i Handlers
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
    };
}