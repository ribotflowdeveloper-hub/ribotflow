"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Reply, Inbox, PanelRightClose, PanelRightOpen, Loader2 } from 'lucide-react';
import type { Ticket } from '../page';

// ✅ SOLUCIÓ: S'utilitza la versió simplificada del renderer.
// Aquesta versió omple el contenidor pare i gestiona el seu propi scroll intern.
const SafeEmailRenderer: React.FC<{ htmlBody: string }> = ({ htmlBody }) => {
    const documentSource = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    :root { color-scheme: dark light; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                        margin: 0;
                        padding: 1.5rem; /* Padding intern per al contingut */
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    img, video, iframe, embed, object { max-width: 100%; height: auto; }
                    table { table-layout: fixed; width: 100%; max-width: 100%; }
                    td, th { word-break: break-word; }
                </style>
            </head>
            <body>
                ${htmlBody}
            </body>
        </html>
    `;

    return (
        <iframe
            srcDoc={documentSource}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            title="email-content"
        />
    );
};


interface TicketDetailProps {
    ticket: Ticket | null;
    body: string | null;
    isLoading: boolean;
    onReply: (ticket: Ticket) => void;
    isContactPanelOpen: boolean;
    onToggleContactPanel: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, body, isLoading, onReply, isContactPanelOpen, onToggleContactPanel }) => {
    const t = (key: string) => {
        const translations: { [key: string]: string } = {
            'selectConversationTitle': "Selecciona una conversa",
            'selectConversationDescription': "Tria un element de la llista per veure'n el contingut.",
            'replyButton': "Respon",
            'hideContactPanel': "Amaga el panell de contacte",
            'showContactPanel': "Mostra el panell de contacte"
        };
        return translations[key] || key;
    };

    if (!ticket) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center text-center p-4">
                <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">{t('selectConversationTitle')}</h2>
                <p className="text-muted-foreground">{t('selectConversationDescription')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-muted/30 min-w-0">
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl lg:text-2xl font-bold truncate">{ticket.subject}</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => onReply(ticket)}>
                        <Reply className="mr-2 h-4 w-4" />{t('replyButton')}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onToggleContactPanel} title={isContactPanelOpen ? t('hideContactPanel') : t('showContactPanel')}>
                        {isContactPanelOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* ✅ SOLUCIÓ: Aquest contenidor pren l'espai restant i embolcalla el renderer. */}
            <div className="flex-1 min-h-0 relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    // El renderer s'expandeix per omplir aquest contenidor.
                    <div className="absolute inset-0">
                        <SafeEmailRenderer htmlBody={body || ''} />
                    </div>
                )}
            </div>
        </div>
    );
};

