"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner"; // ✅ Canviem la importació
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, LayoutGrid, List } from 'lucide-react';
import { type Contact } from '@/types/crm'; // ✅ CORRECT
import { CONTACT_STATUS_MAP } from '@/types/crm'; // ✅ Importa el nou mapa
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import ContactCard from '@/app/[locale]/(app)/crm/contactes/_components/ContactCard';
import ContactTable from '@/app/[locale]/(app)/crm/contactes/_components/ContactTable';
import { createContactAction } from './actions';


/**
 * Component principal i interactiu per a la pàgina de llista de contactes.
 * Gestiona l'estat de la cerca, el mode de visualització (targetes o llista)
 * i el diàleg per crear nous contactes.
 */
export function ContactsClient({ initialContacts, totalPages, currentPage }: {
    initialContacts: Contact[],
    totalPages: number,
    currentPage: number
}) {
    const t = useTranslations('ContactsClient');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

    // Funció per navegar a la pàgina de detall d'un contacte.
    const handleContactClick = (contact: Contact) => {
        router.push(`/crm/contactes/${contact.id}`);
    };
    // 'useMemo' optimitza el filtratge de contactes. Només es torna a executar
    // si la llista de 'contacts' o el 'searchTerm' canvien.
    const filteredContacts = useMemo(() => contacts.filter(c =>
        (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [contacts, searchTerm]);
    /**
   * Gestiona l'enviament del formulari de nou contacte.
   * Crida la Server Action 'createContactAction' i gestiona la resposta.
   */
    const handleSaveContact = (formData: FormData) => {
        startTransition(async () => {
            const result = await createContactAction(formData);
            if (result.error) {
                toast.error(t('toastErrorTitle'), { description: result.error.message });
            } else if (result.data) {
                toast.success(t('toastSuccessTitle'), { description: t('toastSuccessDescription') });
                setContacts(prev => [result.data as Contact, ...prev]);
                setIsDialogOpen(false);
            }
        });
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Cerca..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('cards')}><LayoutGrid className="w-4 h-4" /></Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />{t('newContactButton')}</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('dialogTitle')}</DialogTitle>
                                <DialogDescription>{t('dialogDescription')}</DialogDescription>
                            </DialogHeader>
                            <form action={handleSaveContact} className="space-y-4 pt-4">
                                <Input name="nom" placeholder={t('namePlaceholder')} required />
                                <Input name="empresa" placeholder={t('companyPlaceholder')} />
                                <Input name="email" type="email" placeholder={t('emailPlaceholder')} required />
                                <Input name="telefon" placeholder={t('phonePlaceholder')} />
                                <Input name="valor" type="number" placeholder={t('valuePlaceholder')} defaultValue={0} />
                                {/* 👇 AQUÍ VE EL CANVI 👇 */}
                                <Select name="estat" defaultValue="Lead">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {/* ✅ 2. Fem un map sobre la constant per generar les opcions */}
                                        {/* ✅ Mapejem sobre el nou mapa de dades */}
                                        {CONTACT_STATUS_MAP.map(status => (
                                            <SelectItem
                                                key={status.code}
                                                value={status.code} // <-- El valor que s'envia al servidor és el CODI
                                            >
                                                {t(`contactStatuses.${status.key}`)} {/* <-- El text que veu l'usuari és la TRADUCCIÓ */}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancelButton')}</Button></DialogClose>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('saveButton')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                <AnimatePresence mode="wait">
                    <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {filteredContacts.length > 0 ? (
                            viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                    {filteredContacts.map(contact => (
                                        <ContactCard key={contact.id} contact={contact} onClick={() => handleContactClick(contact)} />
                                    ))}
                                </div>
                            ) : (<ContactTable contacts={filteredContacts} onRowClick={handleContactClick} />)
                        ) : (<div className="text-center py-16"><p>{t('noContactsFound')}</p></div>)}
                    </motion.div>
                </AnimatePresence>
            </div>
            {/* ✅ NOU: Afegeix els botons de paginació al final */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                    <Button asChild disabled={currentPage <= 1}>
                        <Link href={`/crm/contactes?page=${currentPage - 1}`}>Anterior</Link>
                    </Button>
                    <span>Pàgina {currentPage} de {totalPages}</span>
                    <Button asChild disabled={currentPage >= totalPages}>
                        <Link href={`/crm/contactes?page=${currentPage + 1}`}>Següent</Link>
                    </Button>
                </div>
            )}
        </motion.div>
    );
};