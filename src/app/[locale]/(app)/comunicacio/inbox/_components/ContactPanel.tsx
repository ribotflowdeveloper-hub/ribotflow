"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Building, UserPlus } from 'lucide-react';
// import { useTranslations } from 'next-intl';
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
    const t = (key: string) => {
         const translations: { [key: string]: string } = {
            'noContactAssociated': "Selecciona un tiquet per veure els detalls del contacte.",
            'contactDetailsTitle': "Detalls del Contacte",
            'emailLabel': "Correu",
            'phoneLabel': "Telèfon",
            'locationLabel': "Ubicació",
            'notSpecified': "No especificat",
            'saveContactButton': "Desa com a contacte"
        };
        return translations[key] || key;
    };

    return (
        // ✅ SOLUCIÓ: El contenidor principal és un flex-col que ocupa tota l'alçada.
        <div className="flex flex-col h-full border-l border-border bg-background/95">
            {!ticket ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <User className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('noContactAssociated')}</p>
                </div>
            ) : ticket.contacts ? (
                <>
                    <div className="p-4 border-b flex-shrink-0"><h2 className="text-xl font-bold">{t('contactDetailsTitle')}</h2></div>
                    {/* ✅ SOLUCIÓ: Aquesta secció ocupa l'espai restant i fa scroll si cal. */}
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
