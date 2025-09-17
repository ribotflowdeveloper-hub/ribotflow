
"use client";

import React from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Reply, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ticket } from '../page';
import { Loader2 } from 'lucide-react';

interface TicketDetailProps {
    ticket: Ticket | null;
    body: string | null;
    isLoading: boolean;
    onReply: (ticket: Ticket) => void;
}

/**
 * @summary Component que renderitza la columna central de l'Inbox: el detall del tiquet seleccionat.
 */
export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, body, isLoading, onReply }) => {
    const t = useTranslations('InboxPage');

    if (!ticket) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">{t('selectConversationTitle')}</h2>
                <p className="text-muted-foreground">{t('selectConversationDescription')}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
            {/* Capçalera del detall */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                <h2 className="text-2xl font-bold truncate">{ticket.subject}</h2>
                <Button variant="outline" onClick={() => onReply(ticket)}>
                    <Reply className="mr-2 h-4 w-4" />{t('replyButton')}
                </Button>
            </div>
            {/* Cos del correu (HTML sanititzat) */}
            {/* Cos del correu */}
            <div className="flex-1 p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div
                        className="prose-email max-w-none"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body || '') }}
                    />
                )}
            </div>
        </div>
    );
};