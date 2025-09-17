"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Inbox, PenSquare, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ticket } from '../page';
import { TicketFilter } from '@/types/crm';

// Funció utilitària per formatejar les dates
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

// Propietats que el component espera rebre
interface TicketListProps {
    tickets: Ticket[];
    selectedTicketId: number | null;
    activeFilter: string;
    unreadCount: number;
    sentCount: number;
    isPendingRefresh: boolean;
    totalCount: number; // ✅ AFEGIT
    onSearchChange: (value: string) => void; // ✅ AÑADE ESTA LÍNEA
    searchTerm: string; // ✅ AÑADE ESTA LÍNEA

    onSelectTicket: (ticket: Ticket) => void;
    onDeleteTicket: (ticket: Ticket) => void;
    onSetFilter: (filter: TicketFilter) => void;
    onComposeNew: () => void;
    onRefresh: () => void;
    hasMore: boolean;
    onLoadMore: () => void;
    onLoadAll?: () => void;



}

/**
 * @summary Component que renderitza la columna esquerra de l'Inbox: capçalera, filtres i llista de tiquets.
 */
export const TicketList: React.FC<TicketListProps> = ({
    tickets,
    selectedTicketId,
    activeFilter,
    unreadCount,
    sentCount,
    isPendingRefresh,
    totalCount,
    onSelectTicket,
    onDeleteTicket,
    onSetFilter,
    onComposeNew,
    onRefresh,
    hasMore,
    onLoadMore,



}) => {
    const t = useTranslations('InboxPage');

    return (
        <div className="w-80 lg:w-96 flex flex-col flex-shrink-0 border-r border-border glass-card">
            {/* Capçalera amb títol i botons d'acció */}
            <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                <h1 className="text-xl font-bold">{t('inboxTitle')}</h1>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={onComposeNew} title={t('composeButtonTooltip')}><PenSquare className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isPendingRefresh} title={t('refreshButtonTooltip')}><RefreshCw className={`w-4 h-4 ${isPendingRefresh ? 'animate-spin' : ''}`} /></Button>
                </div>
            </div>

            {/* Filtres de la safata d'entrada */}
            <div className=" flex gap-2 border-b border-border flex-shrink-0">
                <Button
                    variant={activeFilter === 'tots' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onSetFilter('tots')}
                >
                    Tots <span className=" text-xs">{totalCount}</span>
                </Button>

                <Button
                    variant={activeFilter === 'rebuts' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onSetFilter('rebuts')}
                >
                    Rebuts <span className=" text-xs">{totalCount - sentCount}</span>
                </Button>

                <Button
                    variant={activeFilter === 'noLlegits' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onSetFilter('noLlegits')}
                >
                    No llegits
                    <span className={`text-xs px-1 py-0.5 rounded-full ${unreadCount > 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>
                        {unreadCount}
                    </span>
                </Button>

                <Button
                    variant={activeFilter === 'enviats' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onSetFilter('enviats')}
                >
                    Enviats <span className=" text-xs">{sentCount}</span>
                </Button>
            </div>


            {/* Llista de Tiquets */}
            <div className="flex-1 overflow-y-auto">
                {tickets.length > 0 ? tickets.map(ticket => (
                    <div
                        key={ticket.id}
                        onClick={() => onSelectTicket(ticket)}
                        className={`group p-4 cursor-pointer border-l-4 relative ${selectedTicketId === ticket.id ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted'}`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <p className={`truncate font-semibold ${ticket.status !== 'Obert' ? 'font-normal text-muted-foreground' : ''}`}>{ticket.contacts?.nom || ticket.sender_name || t('unknownSender')}</p>
                            <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                                {ticket.status === 'Obert' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                                <span className="text-muted-foreground">{formatTicketDate(ticket.sent_at)}</span>
                            </div>
                        </div>
                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground truncate mt-1">{ticket.preview}</p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket); }}
                            title={t('deleteButtonTooltip')}
                        >
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
            {/* ✅ NOU: Botó per carregar més */}
            {hasMore && (
                <div className="p-4 border-t border-border">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={onLoadMore}
                        disabled={isPendingRefresh}
                    >
                        {isPendingRefresh ? "Carregant..." : "Carregar més"}
                    </Button>
                </div>
            )}
        </div>
    );
};