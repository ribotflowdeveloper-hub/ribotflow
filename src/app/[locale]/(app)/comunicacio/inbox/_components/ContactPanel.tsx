"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { User, Building, UserPlus, Mail, Phone, MapPin, ExternalLink, Euro } from 'lucide-react';
import type { Ticket } from '../page';
import Link from 'next/link';
// Importem el nostre diàleg reutilitzable
import { ContactDialog } from '@/app/[locale]/(app)/crm/contactes/_components/ContactDialog';
import type { Contact } from '@/types/crm'; // Importem el tipus Contact

interface ContactPanelProps {
    ticket: Ticket | null;
    isPendingSave: boolean;
    // La funció onSaveContact és crucial per a vincular el nou contacte creat amb els tiquets.
    onSaveContact: (ticket: Ticket) => void;
    allTeamContacts: Contact[]; // ✅ Rebem la llista de tots els contactes

}

export const ContactPanel: React.FC<ContactPanelProps> = ({ ticket, isPendingSave, onSaveContact, allTeamContacts }) => {
    // La teva funció de traduccions (la deixo aquí per si la vols ampliar)
    const t = (key: string) => {
        const translations: { [key: string]: string } = {
            'noContactAssociated': "Selecciona un tiquet per veure'n els detalls.",
            'contactDetailsTitle': "Detalls del Contacte",
            'viewFullProfile': "Veure fitxa completa",
            'emailLabel': "Correu",
            'phoneLabel': "Telèfon",
            'locationLabel': "Ubicació",
            'valueLabel': "Valor",
            'statusLabel': "Estat",
            'notSpecified': "No especificat",
            'saveContactButton': "Desa com a contacte"
        };
        return translations[key] || key;
    };
    // ✅ LÒGICA CLAU: Utilitzem 'useMemo' per a determinar si el contacte existeix.
    // Aquesta comprovació només es re-executa si el 'ticket' o la llista de contactes canvien.
    const contactToShow = useMemo(() => {
        if (!ticket) return null;

        // Prioritat 1: El tiquet ja està vinculat a un contacte.
        if (ticket.contacts) {
            console.log("%c[DEBUG] Cas 1: El tiquet ja estava vinculat.", "color: green", ticket.contacts);

            return ticket.contacts;
        }

                // --- INICI DE LA ZONA DE DEPURACIÓ ---
                console.group(`[DEBUG] Buscant contacte per a: "${ticket.sender_email}"`);
                console.log("Llista de contactes de l'equip:", allTeamContacts);
        
                const existingContact = allTeamContacts.find(contact => {
                    // Comprovem que ambdós emails existeixen abans de comparar
                    if (!contact.email || !ticket.sender_email) return false;
        
                    const contactEmail = contact.email.trim().toLowerCase();
                    const ticketEmail = ticket.sender_email.trim().toLowerCase();
        
                    // Log de cada comparació per veure exactament què passa
                    console.log(`Comparant: "${ticketEmail}" === "${contactEmail}" -> ${contactEmail === ticketEmail}`);
                    
                    return contactEmail === ticketEmail;
                });
        
                if (existingContact) {
                    console.log("%c[DEBUG] Cas 2: S'ha trobat un contacte existent per email.", "color: blue", existingContact);
                } else {
                    console.log("%c[DEBUG] Cas 3: No s'ha trobat cap contacte. S'hauria de mostrar el botó de desar.", "color: orange");
                }
                console.groupEnd();
                // --- FI DE LA ZONA DE DEPURACIÓ ---

     

        return existingContact || null;
    }, [ticket, allTeamContacts]);
    return (
        <div className="flex flex-col h-full border-l border-border bg-background/95">
            {!ticket ? (
                // --- VISTA INICIAL QUAN NO HI HA CAP TIQUET SELECCIONAT ---
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <User className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('noContactAssociated')}</p>
                </div>
            ) : contactToShow ? ( // ✅ ARA LA CONDICIÓ ÉS 'contactToShow'
                // --- VISTA MILLORADA QUAN EL CONTACTE JA EXISTEIX ---
                <>
                    <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-bold">Detalls del Contacte</h2>
                        <Button asChild variant="secondary" size="sm">
                            <Link href={`/crm/contactes/${contactToShow.id}`}>
                                Veure fitxa completa <ExternalLink className="w-4 h-4 ml-2"/>
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
                                <span>{contactToShow.telefon || "No especificat"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>{contactToShow.ubicacio || "No especificada"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Euro className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>Valor: {contactToShow.valor ?? 0} €</span>
                            </div>
                             <div className="flex items-center gap-3">
                                <UserPlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span>Estat: <span className="font-medium">{contactToShow.estat}</span></span>
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
                                <UserPlus className="w-4 h-4 mr-2"/>
                                Desa com a contacte
                            </Button>
                        }
                        initialData={{
                            nom: ticket.sender_name,
                            email: ticket.sender_email
                        }}
                        onContactSaved={() => onSaveContact(ticket)}
                    />
                </div>
            )}
        </div>
    );
};