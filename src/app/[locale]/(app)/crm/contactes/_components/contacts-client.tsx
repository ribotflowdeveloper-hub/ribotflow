// @/app/[locale]/(app)/crm/contactes/_components/ContactsClient.tsx (Versió Corregida)
"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, List, FilePlus2, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

import { type Contact, CONTACT_STATUS_MAP } from '@/types/crm';

import { useContactFilters } from '../_hooks/useContactFilters';

import { ContactDialog } from './ContactDialog';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';
import ExcelDropdownButton, { DropdownOption } from '@/app/[locale]/(app)/excel/ExcelDropdownButton';
import { exportToExcel,importFromExcel } from '@/app/[locale]/(app)/excel/actions';
import { TURBOPACK_CLIENT_MIDDLEWARE_MANIFEST } from 'next/dist/shared/lib/constants';

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
    const t2 = useTranslations('excel');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isExporting, startTransition] = useTransition(); 

    const { sortBy, statusFilter, viewMode, handleFilterChange } = useContactFilters(initialViewMode);

    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    const filteredContacts = useMemo(() => contacts.filter(c =>
        (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [contacts, searchTerm]);

    const handleContactClick = (contact: Contact) => {
        router.push(`/crm/contactes/${contact.id}`);
    };

    const excelOptions: DropdownOption[] = [
        { value: 'create', label: t2('contacts.create'), icon: FilePlus2 },
        { value: 'load', label: t2('contacts.load'), icon: Upload },
        { value: 'download', label: t2('contacts.download'), icon: Download },
    ];

    async function handleExportAndDownload(shouldDownload: boolean) {
        toast.info(t2('contacts.startingexport'));
        try {
            const result = await exportToExcel('contacts', shouldDownload);

            if (result.success && result.fileBuffer) {
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

                toast.success(t2('successexport'));
            } else {
                toast.error(t2('errorexport'), { description: result.message });
            }
        } catch (error) {
            toast.error(t2('unexpectederror'), { description: (error as Error).message });
            console.error(error);
        }
    }

    /* Funció del costat del client per iniciar el procés d'importació.
    * Crea un input de fitxers i el llança.
     */
    function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {

            toast.error(t2('nofileselected'));
                return;
            }

            toast.info(t2('processingfile'));

            const formData = new FormData();
            formData.append('file', file);

            startTransition(async () => {
                try {
                    const result = await importFromExcel('contacts', formData);

                    if (result.success) {
                        toast.success(result.message);
                    } else {
                        toast.error(t2('errorloadingdata'), { description: result.message });
                    }
                } catch (error) {
                    toast.error(t2('unexpectederrorloadingfile'), { description: (error as Error).message });
                }
            });
        };

        input.click();
    }

    const handleExcelAction = (option: DropdownOption) => {
        switch (option.value) {
            case 'download':
                startTransition(() => handleExportAndDownload(true)); // ➡️ ARA ES CRIDA startTransition
                break;
            case 'create':
                startTransition(() => handleExportAndDownload(false)); // ➡️ I AQUÍ TAMBÉ
                break;
            case 'load':
                handleImport();
                break;
            default:
                break;
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