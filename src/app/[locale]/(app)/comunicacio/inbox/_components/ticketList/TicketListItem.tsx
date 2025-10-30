// src/app/[locale]/(app)/comunicacio/inbox/_components/ticketList/TicketListItem.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { UITicket } from './index';
import type { EnrichedTicket } from '@/types/db';

const formatTicketDate = (dateString: string | null, locale: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date >= startOfToday) {
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    }
};

const getInitials = (name: string | null | undefined, fallback: string) => {
    if (!name) return fallback;
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

interface TicketListItemProps {
    ticket: UITicket;
    isSelected: boolean;
    onSelectTicket: (ticket: EnrichedTicket) => void;
    onDeleteTicket: (ticket: EnrichedTicket) => void;
}

export const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, isSelected, onSelectTicket, onDeleteTicket }) => {
    const t = useTranslations('InboxPage');
    const locale = useLocale();

    const handleSelect = () => {
        if (ticket.id !== null) {
            onSelectTicket(ticket as EnrichedTicket);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (ticket.id !== null) {
            onDeleteTicket(ticket as EnrichedTicket);
        }
    };

    return (
        <div
            onClick={handleSelect}
            className={`group cursor-pointer border-l-4 relative transition-colors
    ${isSelected
                    ? 'border-primary bg-muted'
                    : `${ticket.ownerColorClass || 'border-transparent'} hover:bg-muted/30`
                }`}
        >
            <div className="p-2 flex items-start gap-3">
                <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                    <AvatarImage src={ticket.profile_avatar_url ?? undefined} />
                    <AvatarFallback>{getInitials(ticket.profile_full_name, t('initialsFallback'))}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <p className={`truncate text-sm font-semibold ${ticket.status === 'Llegit' ? 'font-normal text-muted-foreground' : ''}`}>
                            {ticket.contact_nom || ticket.sender_name || t('unknownSender')}
                        </p>
                        <div className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
                            {ticket.status !== 'Llegit' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>}
                            <span className="text-muted-foreground">{formatTicketDate(ticket.sent_at, locale)}</span>
                        </div>
                    </div>
                    <p className="text-xs truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.preview}</p>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={handleDelete}
            >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
        </div>
    );
};