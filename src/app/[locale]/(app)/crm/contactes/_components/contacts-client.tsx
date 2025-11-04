// @/app/[locale]/(app)/crm/contactes/_components/ContactsClient.tsx
"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// ✅ 1. Importem Tooltip i una icona de bloqueig
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, LayoutGrid, List, FilePlus2, Upload, Download, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Database } from '@/types/supabase';
import { type ContactWithOpportunities } from './ContactsData';
import { CONTACT_STATUS_MAP } from '@/config/contacts';
// ✅ 2. Importem el tipus del nostre resultat de límit
import { type UsageCheckResult } from '@/lib/subscription/subscription';

import { useContactFilters } from '../_hooks/useContactFilters';

import { ContactDialog } from './ContactDialog';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';
import ExcelDropdownButton, { DropdownOption } from '@/app/[locale]/(app)/excel/ExcelDropdownButton';
import { exportToExcel, importFromExcel } from '@/app/[locale]/(app)/excel/actions';

type Contact = Database['public']['Tables']['contacts']['Row'];

interface ContactsClientProps {
    initialContacts: ContactWithOpportunities[];
    totalPages: number;
    currentPage: number;
    initialViewMode: 'cards' | 'list';
    limitStatus: UsageCheckResult; // ✅ 3. Afegim la nova prop
}

export function ContactsClient({
    initialContacts,
    totalPages,
    currentPage,
    initialViewMode,
    limitStatus // ✅ 4. Rebem la prop
}: ContactsClientProps) {
    const t = useTranslations('ContactsClient');
    const t2 = useTranslations('excel');
    // ✅ 5. Afegim traduccions de Billing per als missatges de límit
    const t_billing = useTranslations('Billing');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isExporting, startTransition] = useTransition();

    const { sortBy, statusFilter, viewMode, handleFilterChange } = useContactFilters(initialViewMode);

    const [contacts, setContacts] = useState<ContactWithOpportunities[]>(initialContacts);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    // ✅ 6. Calculem si s'ha assolit el límit
    const isLimitReached = !limitStatus.allowed;

    const filteredContacts = useMemo(() => contacts.filter(c =>
        (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [contacts, searchTerm]);

    const handleContactClick = (contact: ContactWithOpportunities) => {
        router.push(`/crm/contactes/${contact.id}`);
    };

    const excelOptions: DropdownOption[] = [
        { value: 'create', label: t2('contacts.create'), icon: FilePlus2 },
        { value: 'load', label: t2('contacts.load'), icon: Upload },
        { value: 'download', label: t2('contacts.download'), icon: Download },
    ];

    // ... (lògica de handleExportAndDownload i handleImport) ...
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

    function handleImport() {
        // ✅ 7. Afegim la comprovació de límit ABANS de pujar l'Excel
        if (isLimitReached) {
            toast.error(t_billing('limitReachedTitle'), {
                description: limitStatus.error || t_billing('limitReachedDefault')
            });
            return;
        }

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
                    // La Server Action 'importFromExcel' també hauria de tenir
                    // la validació de límits per a cada fila que importa.
                    const result = await importFromExcel('contacts', formData);

                    if (result.success) {
                        toast.success(result.message);
                        // Aquí hauríem de refrescar les dades per veure els nous contactes
                        // i possiblement el nou estat del límit.
                        router.refresh();
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
                startTransition(() => handleExportAndDownload(true));
                break;
            case 'create':
                startTransition(() => handleExportAndDownload(false));
                break;
            case 'load':
                handleImport(); // Aquesta funció ara té la comprovació de límit
                break;
            default:
                break;
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            {/* CAPÇALERA */}
            {/* CAPÇALERA RESPONSIVE */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-6">
                {/* Títol */}
                <h1 className="text-2xl sm:text-3xl font-bold text-balance">{t('title')}</h1>

                {/* Controls */}
                <div className="flex flex-wrap gap-2 w-full items-center">
                    {/* 🔍 Cercador */}
                    <div className="relative flex-grow min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* 🔽 Ordenar */}
                    <Select value={sortBy} onValueChange={(value) => handleFilterChange('sort', value)}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder={t('filters.sortBy')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t('filters.newest')}</SelectItem>
                            <SelectItem value="oldest">{t('filters.oldest')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* 📊 Estat */}
                    <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[160px]">
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

                    {/* 👁️ Modes de vista (icones) */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
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

                    {/* 🧾 Excel Dropdown */}
                    <ExcelDropdownButton
                        options={excelOptions}
                        onSelect={handleExcelAction}
                        disabled={isExporting}
                    />

                    {/* ➕ Nou contacte (amb límit) */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span tabIndex={isLimitReached ? 0 : -1}>
                                    <ContactDialog
                                        trigger={
                                            <Button className="flex-shrink-0 w-full sm:w-auto" disabled={isLimitReached}>
                                                {isLimitReached ? (
                                                    <Lock className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <Plus className="w-4 h-4 mr-1" />
                                                )}
                                                <span className="hidden md:inline">{t('newContactButton')}</span>
                                            </Button>
                                        }
                                        onContactSaved={(newContact) => {
                                            setContacts(prev => [
                                                { ...(newContact as Contact), opportunities: [] },
                                                ...prev
                                            ]);
                                            router.refresh();
                                        }}
                                        isLimitReached={isLimitReached}
                                        limitError={limitStatus.error}
                                    />
                                </span>
                            </TooltipTrigger>

                            {isLimitReached && (
                                <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-yellow-900" />
                                            <h3 className="font-semibold">{t_billing('limitReachedTitle')}</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {limitStatus.error || t_billing('limitReachedDefault')}
                                        </p>
                                        <Button asChild size="sm" className="mt-1 w-full">
                                            <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                                        </Button>
                                    </div>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>


            {/* LLISTA DE CONTACTES */}
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

            {/* PAGINACIÓ */}
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