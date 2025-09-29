"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Inbox, PenSquare, RefreshCw, ChevronDown, LayoutGrid, Mail, Send } from 'lucide-react';
import type { Ticket } from '../page';
import { TicketFilter } from '@/types/crm';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@supabase/supabase-js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const formatTicketDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (date >= startOfToday) {
        return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
    }
};
// ✅ PAS 2: Creem un nou tipus que inclogui les dades addicionals de l'usuari propietari.
type EnrichedTicket = Ticket & {
    owner?: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    ownerColorClass?: string;
};

// ✅ NOU: Definim el tipus per als membres
type TeamMember = {
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

type Permission = { target_user_id: string };

interface TicketListProps {
    user: User; // L'usuari actual
    teamMembers: TeamMember[]; // La llista de membres
    permissions: Permission[]; // ✅ Acceptem els permisos
    tickets: EnrichedTicket[];
    selectedTicketId: number | null;
    activeFilter: string;
    inboxFilter: string; // El filtre de bústia actiu
    onSetInboxFilter: (userId: string) => void; // Funció per canviar el filtre
    unreadCount: number;
    sentCount: number;
    isPendingRefresh: boolean;
    totalCount: number;
    onSearchChange: (value: string) => void;
    searchTerm: string;
    onSelectTicket: (ticket: Ticket) => void;
    onDeleteTicket: (ticket: Ticket) => void;
    onSetFilter: (filter: TicketFilter) => void;
    onComposeNew: () => void;
    onRefresh: () => void;
    hasMore: boolean;
    onLoadMore: () => void;
}
export const TicketList: React.FC<TicketListProps> = ({
    user, teamMembers, permissions, tickets, selectedTicketId, activeFilter, unreadCount,
    sentCount, isPendingRefresh, totalCount, onSelectTicket, onDeleteTicket,
    onSetFilter, onComposeNew, onRefresh, hasMore, onLoadMore, inboxFilter, onSetInboxFilter,
}) => {
    const t = (key: string) => {
        const translations: { [key: string]: string } = {
            'inboxTitle': "Safata d'entrada", 'composeButtonTooltip': "Redacta", 'refreshButtonTooltip': "Actualitza",
            'unknownSender': "Remitent desconegut", 'deleteButtonTooltip': "Elimina", 'emptyInbox': "Safata d'entrada buida.",
        };
        return translations[key] || key;
    };
    // ✅ PAS 3: Afegim la funció auxiliar per a obtenir les inicials
    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };


    // ✅ NOU: Calculem quins membres tenim permís per veure
    const permittedMembers = useMemo(() => {
        const permittedIds = new Set(permissions.map(p => p.target_user_id));
        return teamMembers.filter(m => m.profiles && m.profiles.id !== user.id && permittedIds.has(m.profiles.id));
    }, [permissions, teamMembers, user.id]);

    const selectedInboxName = useMemo(() => {
        if (inboxFilter === 'all') return "Totes les bústies";
        if (inboxFilter === user.id) return "Els meus correus";
        const member = teamMembers.find(m => m.profiles?.id === inboxFilter);
        return member?.profiles?.full_name || "Bústia desconeguda";
    }, [inboxFilter, teamMembers, user.id]);
    return (
        <div className="w-full h-full flex flex-col flex-shrink-0 border-r border-border glass-card">
            <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                {/* ✅ CANVI: El títol ara és el menú desplegable */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-lg font-bold p-2 -ml-2">
                            {selectedInboxName}
                            <ChevronDown className="w-5 h-5 ml-2 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => onSetInboxFilter('all')}>Totes les bústies</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetInboxFilter(user.id)}>Els meus correus</DropdownMenuItem>
                        {/* ✅ CANVI: Només mostrem els membres permesos */}
                        {permittedMembers.length > 0 && <DropdownMenuSeparator />}
                        {permittedMembers.map(member => (
                            member.profiles && (
                                <DropdownMenuItem key={member.profiles.id} onClick={() => onSetInboxFilter(member.profiles!.id)}>
                                    {member.profiles.full_name || 'Usuari sense nom'}
                                </DropdownMenuItem>
                            )
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={onComposeNew} title={t('composeButtonTooltip')}><PenSquare className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isPendingRefresh} title={t('refreshButtonTooltip')}><RefreshCw className={`w-4 h-4 ${isPendingRefresh ? 'animate-spin' : ''}`} /></Button>
                </div>
            </div>

            <TooltipProvider delayDuration={0}>
                <div className="p-2 grid grid-cols-4 gap-2 border-b border-border flex-shrink-0">

                    {/* Filtre: Tots */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={activeFilter === 'tots' ? 'secondary' : 'ghost'} size="sm" onClick={() => onSetFilter('tots')} className="w-full flex items-center justify-center gap-2">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="text-xs text-muted-foreground">{totalCount}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Tots</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Filtre: Rebuts */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={activeFilter === 'rebuts' ? 'secondary' : 'ghost'} size="sm" onClick={() => onSetFilter('rebuts')} className="w-full flex items-center justify-center gap-2">
                                <Inbox className="h-4 w-4" />
                                <span className="text-xs text-muted-foreground">{totalCount - sentCount}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Rebuts</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Filtre: No Llegits */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={activeFilter === 'noLlegits' ? 'secondary' : 'ghost'} size="sm" onClick={() => onSetFilter('noLlegits')} className="w-full flex items-center justify-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span className={`text-xs px-2 py-0.5 rounded-full ${unreadCount > 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>{unreadCount}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>No llegits</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Filtre: Enviats */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={activeFilter === 'enviats' ? 'secondary' : 'ghost'} size="sm" onClick={() => onSetFilter('enviats')} className="w-full flex items-center justify-center gap-2">
                                <Send className="h-4 w-4" />
                                <span className="text-xs text-muted-foreground">{sentCount}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Enviats</p>
                        </TooltipContent>
                    </Tooltip>

                </div>
            </TooltipProvider>

            <div className="flex-1 h-0 overflow-y-auto">
                {tickets.length > 0 ? tickets.map(ticket => (
                    // ✅ PAS 4: Apliquem la classe de color i modifiquem l'estructura interna
                    <div
                        key={ticket.id}
                        onClick={() => onSelectTicket(ticket)}
                        className={`group cursor-pointer border-l-4 relative 
                            ${selectedTicketId === ticket.id
                                ? 'border-primary bg-muted'
                                : `${ticket.ownerColorClass || 'border-transparent'} hover:bg-muted/50`
                            }`
                        }
                    >
                        <div className="p-4 flex items-start gap-4">
                            <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                                <AvatarImage src={ticket.owner?.avatar_url ?? undefined} />
                                <AvatarFallback>{getInitials(ticket.owner?.full_name)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <p className={`truncate font-semibold ${ticket.status !== 'NoLlegit' ? 'font-normal text-muted-foreground' : ''}`}>{ticket.contacts?.nom || ticket.sender_name || t('unknownSender')}</p>
                                    <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                                        {ticket.status === 'NoLlegit' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                                        <span className="text-muted-foreground">{formatTicketDate(ticket.sent_at)}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium truncate">{ticket.subject}</p>
                                <p className="text-sm text-muted-foreground truncate mt-1">{ticket.preview}</p>
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket); }} title={t('deleteButtonTooltip')}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <Inbox className="w-12 h-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">{t('emptyInbox')}</p>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="p-4 border-t border-border flex-shrink-0">
                    <Button variant="outline" className="w-full" onClick={onLoadMore} disabled={isPendingRefresh}>
                        {isPendingRefresh ? "Carregant..." : "Carregar més"}
                    </Button>
                </div>
            )}
        </div>
    );
};