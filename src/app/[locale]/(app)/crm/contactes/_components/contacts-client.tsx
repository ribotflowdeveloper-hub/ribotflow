"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

import { ExportContactsButton } from './ExportContactsButton'; // ✅ 1. IMPORTA EL NOU COMPONENT


/**
 * Component principal i interactiu per a la pàgina de llista de contactes.
 * Gestiona l'estat de la cerca, el mode de visualització (targetes o llista)
 * i el diàleg per crear nous contactes.
 */
export function ContactsClient({
    initialContacts,
    totalPages,
    currentPage,
    initialSortBy,
    initialStatus,
    initialViewMode // ✅ NOU: Rebem el mode de vista inicial
}: {
    initialContacts: Contact[],
    totalPages: number,
    currentPage: number,
    initialSortBy: string,
    initialStatus: string,
    initialViewMode: 'cards' | 'list' // ✅ NOU
}) {
    const t = useTranslations('ContactsClient');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>(initialViewMode);
    const [sortBy] = useState(initialSortBy);
    const [statusFilter] = useState(initialStatus);
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
    // ✅ NOU: Inicialitzem l'estat amb el valor de la URL


    // ✅ MODIFICAT: La funció de canvi de filtre ara també gestiona la vista
    const handleFilterChange = (type: 'sort' | 'status' | 'view', value: string) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        current.set(type, value);

        // Si no és un canvi de vista, resetejem la pàgina
        if (type !== 'view') {
            current.set('page', '1');
        }

        const search = current.toString();
        const query = search ? `?${search}` : "";

        // Actualitzem l'estat local de la vista immediatament per a una resposta ràpida de la UI
        if (type === 'view') {
            setViewMode(value as 'cards' | 'list');
        }

        startTransition(() => {
            router.push(`${pathname}${query}`);
        });
    };
    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            {/* ✅ CAPÇALERA AMB DISSENY ADAPTABLE */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <div className="flex w-full sm:w-auto items-center gap-2">
                    {/* El cercador ara ocupa tot l'ample disponible en mòbil */}
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder={t('searchPlaceholder')} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {/* ✅ NOU: Filtres */}
                    <Select value={sortBy} onValueChange={(value) => handleFilterChange('sort', value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('filters.sortBy')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t('filters.newest')}</SelectItem>
                            <SelectItem value="oldest">{t('filters.oldest')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('filters.status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                            {CONTACT_STATUS_MAP.map(status => (
                                <SelectItem key={status.code} value={status.code}>
                                    {t(`contactStatuses.${status.key}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* ✅ MODIFICAT: Els botons de vista ara criden a handleFilterChange */}
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                        <Button
                            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => handleFilterChange('view', 'cards')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => handleFilterChange('view', 'list')}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                    <ExportContactsButton /> {/* ✅ 2. COL·LOCA EL BOTÓ AQUÍ */}

                    {/* Botó de "Nou Contacte" més compacte en mòbil */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex-shrink-0">
                                <Plus className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">{t('newContactButton')}</span>
                            </Button>
                        </DialogTrigger>
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
            {/* ✅ PAGINACIÓ AMB DISSENY ADAPTABLE */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 md:gap-4 mt-8 flex-shrink-0">
                    <Button asChild disabled={currentPage <= 1} size="sm" className="px-3">
                        <Link href={`/crm/contactes?page=${currentPage - 1}`}>
                            <span className="hidden md:inline">{t('pagination.previous')}</span>
                            <span className="md:hidden">←</span>
                        </Link>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {t('pagination.page', { currentPage, totalPages })}
                    </span>
                    <Button asChild disabled={currentPage >= totalPages} size="sm" className="px-3">
                        <Link href={`/crm/contactes?page=${currentPage + 1}`}>
                            <span className="hidden md:inline">{t('pagination.next')}</span>
                            <span className="md:hidden">→</span>
                        </Link>
                    </Button>
                </div>
            )}
        </motion.div>
    );
};