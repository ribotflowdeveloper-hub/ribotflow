// @/app/[locale]/(app)/crm/contactes/_components/ContactsClient.tsx (Versió Refactoritzada)
"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, List, FilePlus2, Upload, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { type Contact, CONTACT_STATUS_MAP } from '@/types/crm';

import { useContactFilters} from '../_hooks/useContactFilters';

import { ContactDialog } from './ContactDialog';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';
import ExcelDropdownButton, { DropdownOption } from '@/app/[locale]/(app)/excel/ExcelDropdownButton';
import { exportToExcel } from '@/app/[locale]/(app)/excel/actions';


// (La definició de les Props no canvia)
interface ContactsClientProps {
    initialContacts: Contact[];
    totalPages: number;
    currentPage: number;
    initialViewMode: 'cards' | 'list';
}

export function ContactsClient({
    initialContacts,
    totalPages,
    currentPage,
    initialViewMode
}: ContactsClientProps) {
    const t = useTranslations('ContactsClient');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isExporting, startExportTransition] = useTransition();

    // ✅ 2. TOTA LA LÒGICA DE FILTRES ARA VE DEL HOOK
    const { sortBy, statusFilter, viewMode, handleFilterChange } = useContactFilters(initialViewMode);
    
    // L'estat dels contactes i del cercador es manté al component, ja que
    // no afecten la URL directament (el filtratge és al client).
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    
    // Aquesta lògica es queda aquí perquè depèn de 'contacts' i 'searchTerm',
    // que són estats interns d'aquest component.
    const filteredContacts = useMemo(() => contacts.filter(c =>
        (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [contacts, searchTerm]);

    const handleContactClick = (contact: Contact) => {
        router.push(`/crm/contactes/${contact.id}`);
    };

    const excelOptions: DropdownOption[] = [
        { value: 'create', label: t('excel.create'), icon: FilePlus2 },
        { value: 'load', label: t('excel.load'), icon: Upload },
        { value: 'download', label: t('excel.download'), icon: Download },
    ];

    const handleExcelAction = (option: DropdownOption) => {
        if (option.value === 'download') {
            startExportTransition(async () => {
                toast.info("Iniciant l'exportació de contactes...");
                const result = await exportToExcel('contacts', true);

                if (result.success && result.fileBuffer) {
                    // Lògica per descarregar el fitxer al client
                    const byteCharacters = atob(result.fileBuffer);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = result.fileName || 'export.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    toast.success("L'exportació s'ha completat amb èxit.");
                } else {
                    toast.error("Hi ha hagut un error en exportar les dades.", { description: result.message });
                }
            });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            {/* CAPÇALERA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <div className="flex w-full sm:w-auto items-center gap-2">
                    {/* Cercador */}
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder={t('searchPlaceholder')} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    
                    {/* ✅ 3. ELS COMPONENTS DE FILTRE ARA SÓN MÉS SIMPLES */}
                    <Select value={sortBy} onValueChange={(value) => handleFilterChange('sort', value)}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('filters.sortBy')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t('filters.newest')}</SelectItem>
                            <SelectItem value="oldest">{t('filters.oldest')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('filters.status')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                            {CONTACT_STATUS_MAP.map(status => (
                                <SelectItem key={status.code} value={status.code}>
                                    {t(`contactStatuses.${status.key}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Botons de vista */}
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFilterChange('view', 'cards')}>
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFilterChange('view', 'list')}>
                            <List className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* ✅ AQUÍ AFEGIM EL NOU BOTÓ */}
                    <ExcelDropdownButton
                        options={excelOptions}
                        onSelect={handleExcelAction}
                    />

                    <ContactDialog
                        trigger={
                            <Button className="flex-shrink-0">
                                <Plus className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">{t('newContactButton')}</span>
                            </Button>
                        }
                        onContactSaved={(newContact) => setContacts(prev => [newContact as Contact, ...prev])}
                    />
                </div>
            </div>

            {/* LLISTA DE CONTACTES (Això no canvia) */}
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