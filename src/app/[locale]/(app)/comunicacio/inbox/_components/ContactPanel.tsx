"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Building, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ticket } from '../page';

interface ContactPanelProps {
    ticket: Ticket | null;
    isPendingSave: boolean;
    onSaveContact: (ticket: Ticket) => void;
}

/**
 * @summary Component que renderitza la columna dreta de l'Inbox: els detalls del contacte.
 */
export const ContactPanel: React.FC<ContactPanelProps> = ({ ticket, isPendingSave, onSaveContact }) => {
    const t = useTranslations('InboxPage');

    return (
        <div className="w-80 lg:w-96 flex-col flex-shrink-0 border-l border-border glass-card hidden lg:flex">
            {!ticket ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <User className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('noContactAssociated')}</p>
                </div>
            ) : ticket.contacts ? (
                <>
                    <div className="p-4 border-b"><h2 className="text-xl font-bold">{t('contactDetailsTitle')}</h2></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"><User className="w-8 h-8 text-primary" /></div>
                            <div>
                                <h3 className="text-lg font-semibold">{ticket.contacts.nom}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1"><Building className="w-4 h-4" />{ticket.contacts.empresa}</p>
                            </div>
                        </div>
                        <p><strong>{t('emailLabel')}:</strong> {ticket.contacts.email}</p>
                        <p><strong>{t('phoneLabel')}:</strong> {ticket.contacts.telefon || t('notSpecified')}</p>
                        <p><strong>{t('locationLabel')}:</strong> {ticket.contacts.ubicacio || t('notSpecified')}</p>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <User className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="font-semibold">{ticket.sender_name}</p>
                    <p className="text-sm text-muted-foreground mb-4">{ticket.sender_email}</p>
                    <Button onClick={() => onSaveContact(ticket)} disabled={isPendingSave}>
                        <UserPlus className="w-4 h-4 mr-2"/>{t('saveContactButton')}
                    </Button>
                </div>
            )}
        </div>
    );
};