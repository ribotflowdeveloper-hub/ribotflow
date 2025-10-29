// src/app/[locale]/(app)/comunicacio/inbox/_components/ContactPanel.tsx
"use client";

import React, { useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { User, Building, UserPlus, Mail, Phone, MapPin, ExternalLink, Euro, Ban, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { useTranslations } from 'next-intl';
import { ContactDialog } from '@/app/[locale]/(app)/crm/contactes/_components/ContactDialog';
import { addToBlacklistAction } from '../actions';

// ✨ CANVI: Importem els tipus directament des de la nostra única font de la veritat.
import type { Contact, EnrichedTicket } from '@/types/db';

interface ContactPanelProps {
    ticket: EnrichedTicket | null;
    isPendingSave: boolean;
    onSaveContact: (newlyCreatedContact: Contact, originalTicket: EnrichedTicket) => void;
    allTeamContacts: Contact[];
}

export const ContactPanel: React.FC<ContactPanelProps> = ({ ticket, isPendingSave, onSaveContact, allTeamContacts }) => {
    const [isPending, startTransition] = useTransition();
    const t = useTranslations('InboxPage');

    // Simplifiquem la lògica per trobar el contacte a mostrar.
    const contactToShow: Contact | null = useMemo(() => {
        if (!ticket) return null;

        // Cas 1: El tiquet ja té un contact_id vinculat.
        // Construïm un objecte 'Contact' a partir de les dades planes de 'EnrichedTicket'.
        if (ticket.contact_id && ticket.contact_nom) {
            return {
                id: ticket.contact_id,
                nom: ticket.contact_nom,
                email: ticket.contact_email || '',
                // Afegim la resta de camps com a null o valors per defecte, ja que no els tenim a la vista.
                // Això és suficient per a la visualització.
                empresa: null,
                telefon: null,
                ubicacio: null,
                valor: null,
                estat: null,
                created_at: null,
                address: null,
                birthday: null,
                children_count: null,
                hobbies: null,
                industry: null,
                job_title: null,
                last_interaction_at: null,
                lead_source: null,
                marital_status: null,
                notes: null,
                partner_name: null,
                social_media: null,
                team_id: null,
                ultim_contacte: null,
                user_id: null,
                supplier_id: null, // <-- Afegit per complir amb el tipus Contact
            };
        }

        // Cas 2: El tiquet no té contacte vinculat, busquem si existeix un contacte amb el mateix email.
        if (!ticket.sender_email) return null;
        const ticketEmail = ticket.sender_email.trim().toLowerCase();
        return allTeamContacts.find(c => c.email?.trim().toLowerCase() === ticketEmail) || null;

    }, [ticket, allTeamContacts]);

    const handleBlacklist = () => {
        if (!ticket || !ticket.sender_email) return;
        if (confirm(t('confirmBlacklist', { email: ticket.sender_email }))) {
            startTransition(async () => {
                const result = await addToBlacklistAction(ticket.sender_email!);
                toast[result.success ? 'success' : 'error'](result.message);
            });
        }
    };
    return (
        <div className="flex flex-col h-full border-l border-border bg-background/95">
            {!ticket ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <User className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('selectConversationDescription')}</p>
                </div>
            ) : contactToShow ? (
                <>
                    <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-bold">{t('contactDetailsTitle')}</h2>
                        <Button asChild variant="secondary" size="sm">
                            <Link href={`/crm/contactes/${contactToShow.id}`}>
                                {t('viewFullProfile')} <ExternalLink className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{contactToShow.nom}</h3>
                                {contactToShow.empresa && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Building className="w-4 h-4" />{contactToShow.empresa}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3 text-sm pt-4">
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <a href={`mailto:${contactToShow.email}`} className="hover:underline truncate">{contactToShow.email}</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>{contactToShow.telefon || t('notSpecified')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>{contactToShow.ubicacio || t('notSpecified')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Euro className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>{t('valueLabel')}: {contactToShow.valor ?? 0} €</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <UserPlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>{t('statusLabel')}: <span className="font-medium">{contactToShow.estat}</span></span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // --- VISTA QUAN EL CONTACTE NO EXISTEIX ---
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <User className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="font-semibold">{ticket.sender_name}</p>
                    <p className="text-sm text-muted-foreground mb-4">{ticket.sender_email}</p>
                    <ContactDialog
                        trigger={
                            <Button disabled={isPendingSave}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                {t('saveContactButton')}
                            </Button>
                        }
                        initialData={{
                            nom: ticket.sender_name,
                            email: ticket.sender_email
                        }}
                        // ✅ CORRECCIÓ 2: La lògica aquí ara és correcta, ja que 'onSaveContact' espera dos paràmetres.
                        onContactSaved={(newContact) => onSaveContact(newContact as Contact, ticket)}
                    />
                </div>

            )}
            {ticket && (
                <div className="p-4 border-t mt-auto flex-shrink-0">
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={handleBlacklist}
                        // ✅ CORRECCIÓ 2: Utilitzem 'isPending' per a desactivar el botó
                        disabled={isPendingSave || isPending}
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Ban className="w-4 h-4 mr-2" />
                        )}
                        {isPending ? t('blocking') : t('addToBlacklist')}
                    </Button>
                </div>
            )}
        </div>
    );
};