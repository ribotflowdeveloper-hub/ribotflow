// /app/[locale]/(app)/crm/contactes/_components/ContactTable.tsx (Versió Refactoritzada)
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

// ✅ 1. Importem el tipus enriquit des del seu origen correcte.
import { type ContactWithOpportunities } from './ContactsData';
// ✅ 2. Importem la constant des de /config, la seva nova ubicació centralitzada.
import { CONTACT_STATUS_MAP } from '@/config/contacts';

// Definim les propietats que el component espera.
interface ContactTableProps {
    // ✅ 3. Actualitzem la prop per a utilitzar el nou tipus.
    contacts: ContactWithOpportunities[]; 
    onRowClick: (contact: ContactWithOpportunities) => void;
}

/**
 * Component presentacional que renderitza una llista de contactes en format de taula.
 */
const ContactTable: React.FC<ContactTableProps> = ({ contacts, onRowClick }) => {
    const t = useTranslations('ContactsClient');

    const getStatusLabel = (statusCode?: string | null) => { // ✅ Tipat com a string | null per seguretat
        if (!statusCode) return '';
        const statusObject = CONTACT_STATUS_MAP.find(s => s.code === statusCode);
        return statusObject ? t(`contactStatuses.${statusObject.key}`) : statusCode;
    };

    return (
        <div className="glass-card rounded-xl overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-b-border hover:bg-muted/50">
                        <TableHead className="w-[250px]">{t('table.name')}</TableHead>
                        <TableHead>{t('table.status')}</TableHead>
                        <TableHead>{t('table.email')}</TableHead> {/* Aquesta ja era responsive, la deixem */}
                        <TableHead className="hidden md:table-cell">{t('table.phone')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('table.company')}</TableHead>
                        <TableHead className="sm:hidden text-right">...</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contacts.map((contact) => (
                        // ✅ Les propietats com 'id', 'nom', 'estat', etc., continuen funcionant
                        // perquè el nostre nou tipus és un superconjunt del tipus base.
                        <TableRow key={contact.id} onClick={() => onRowClick(contact)} className="border-b-border hover:bg-muted/50 cursor-pointer">
                            <TableCell className="font-medium flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                {contact.nom}
                            </TableCell>
                            <TableCell>
                                <span className={`status-badge status-${contact.estat?.toLowerCase()} shrink-0`}>
                                    {getStatusLabel(contact.estat)}
                                </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell">{contact.email}</TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">{contact.telefon || '-'}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">{contact.empresa || '-'}</TableCell>
                            <TableCell className="sm:hidden text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => onRowClick(contact)}>
                                            {t('table.viewDetails')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ContactTable;