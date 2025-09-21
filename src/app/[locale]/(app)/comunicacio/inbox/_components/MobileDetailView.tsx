/**
 * @file MobileDetailView.tsx
 * @summary Vista de detall que llisca en dispositius mòbils.
 */
"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Reply, Info, UserPlus, Loader2 } from 'lucide-react'; 
import type { Ticket } from '@/types/comunicacio/inbox';
import React from 'react';

// ✅ SOLUCIÓ: S'ha redissenyat aquest component per a ser més simple.
// Ara no calcula l'alçada, sinó que omple el seu contenidor i gestiona el seu propi scroll intern.
const SafeEmailRenderer: React.FC<{ htmlBody: string }> = ({ htmlBody }) => {
    // Estils per assegurar que l'iframe i el seu contingut es comportin correctament.
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
                        padding: 1rem; /* Padding intern per al contingut */
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


interface MobileDetailViewProps {
    ticket: Ticket;
    body: string | null;
    isLoading: boolean;
    isPending: boolean;
    onClose: () => void;
    onReply: (ticket: Ticket) => void;
    onSaveContact: (ticket: Ticket) => void;
}

export function MobileDetailView({ ticket, body, isLoading, isPending, onClose, onReply, onSaveContact }: MobileDetailViewProps) {
    const t = (key: string) => {
        const translations: { [key: string]: string } = {
            'closeButton': "Tanca", 'fromLabel': "De", 'replyButton': "Respon",
            'senderDetailsLabel': "Detalls del remitent", 'nameLabel': "Nom", 'emailLabel': "Correu",
            'saveContactButton': "Desa com a contacte"
        };
        return translations[key] || key;
    };
    
    return (
        <motion.div 
            key={ticket.id} 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }} 
            className="absolute inset-0 flex flex-col bg-background z-20"
        >
            <div className="p-2 border-b border-border flex justify-between items-center flex-shrink-0">
                <div className="flex items-center min-w-0">
                    <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0" aria-label={t('closeButton')}>
                        <X className="w-5 h-5" />
                    </Button>
                    <div className="ml-2 truncate">
                        <p className="font-semibold truncate" title={ticket.subject}>{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground truncate" title={ticket.contacts?.nom || ticket.sender_name}>
                            {t('fromLabel')}: {ticket.contacts?.nom || ticket.sender_name}
                        </p>
                    </div>
                </div>
                <Button size="sm" variant="outline" className="mr-2 flex-shrink-0" onClick={() => onReply(ticket)}>
                    <Reply className="mr-2 h-4 w-4" />
                    {t('replyButton')}
                </Button>
            </div>
            
            {/* ✅ SOLUCIÓ: Aquest contenidor principal ara és flex-col. No té scroll. */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* La secció de detalls no creix i forma part del scroll general si fos necessari (ara no ho és). */}
                <div className="p-4 md:p-6 flex-shrink-0">
                    <details className="border rounded-lg p-3 bg-muted/50">
                        <summary className="cursor-pointer font-semibold flex items-center gap-2 text-sm">
                            <Info className="w-4 h-4 text-primary" /> {t('senderDetailsLabel')}
                        </summary>
                        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                            <p><strong>{t('nameLabel')}:</strong> {ticket.contacts?.nom || ticket.sender_name}</p>
                            <p><strong>{t('emailLabel')}:</strong> {ticket.contacts?.email || ticket.sender_email}</p>
                            {!ticket.contacts && (
                                <Button size="sm" className="w-full mt-2" onClick={() => onSaveContact(ticket)} disabled={isPending}>
                                    <UserPlus className="w-4 h-4 mr-2"/>
                                    {t('saveContactButton')}
                                </Button>
                            )}
                        </div>
                    </details>
                </div>
                {/* ✅ SOLUCIÓ: Aquest nou contenidor ocupa l'espai restant ('flex-1') i conté l'iframe. */}
                <div className="flex-1 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="absolute inset-0">
                             <SafeEmailRenderer htmlBody={body || ''} />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

