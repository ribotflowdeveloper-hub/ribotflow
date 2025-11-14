// @/app/[locale]/(app)/crm/contactes/_components/ContactsClient.tsx
"use client";

// 💡 1. Importem useEffect
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, LayoutGrid, List,Lock } from 'lucide-react';

import { type ContactWithOpportunities } from './ContactsData';
import { CONTACT_STATUS_MAP } from '@/config/contacts';
import { type UsageCheckResult } from '@/lib/subscription/subscription';

import { useContactFilters } from '../_hooks/useContactFilters';

import { ContactDialog } from './ContactDialog';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';
// 💡 3. Importem el botó i accions d'Excel
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';



interface ContactsClientProps {
    initialContacts: ContactWithOpportunities[];
    totalPages: number;
    currentPage: number;
    initialViewMode: 'cards' | 'list';
    limitStatus: UsageCheckResult;
}

export function ContactsClient({
    initialContacts,
    totalPages,
    currentPage,
    initialViewMode,
    limitStatus
}: ContactsClientProps) {
    const t = useTranslations('ContactsClient');
    const t_billing = useTranslations('Billing');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { sortBy, statusFilter, viewMode, handleFilterChange } = useContactFilters(initialViewMode);

    const [contacts, setContacts] = useState<ContactWithOpportunities[]>(initialContacts);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    const isLimitReached = !limitStatus.allowed;
    // 💡 2. TOTA LA LÒGICA D'EXCEL ARA ESTÀ AQUÍ
    const {
        isPending: isExcelPending, // Renombrem per claredat
        excelOptions,
        handleExcelAction
    } = useExcelActions({
        tableName: 'contacts',
        limitStatus: limitStatus, // Passem l'objecte de límit
        translationKeys: {
            create: 'contacts.create',
            load: 'contacts.load',
            download: 'contacts.download',
            limit: 'contacts', // Clau de Shared.limits
        }
    });
    // 💡 2. AFEGIM AQUEST 'useEffect'
    // Això és el que fa que la pàgina s'actualitzi visualment després
    // del router.refresh() (tant a l'importar com al crear).
    useEffect(() => {
        setContacts(initialContacts);
    }, [initialContacts]);

    const filteredContacts = useMemo(() => contacts.filter(c =>
        (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [contacts, searchTerm]);

    const handleContactClick = (contact: ContactWithOpportunities) => {
        router.push(`/crm/contactes/${contact.id}`);
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            {/* CAPÇALERA */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-balance">{t('title')}</h1>

                {/* Controls */}
                <div className="flex flex-wrap gap-2 w-full items-center">
                    {/* Cercador */}
                    <div className="relative flex-grow min-w-[160px]">  
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Ordenar */}
                    <Select value={sortBy} onValueChange={(value) => handleFilterChange('sort', value)}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder={t('filters.sortBy')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t('filters.newest')}</SelectItem>
                            <SelectItem value="oldest">{t('filters.oldest')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Estat */}
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

                    {/* Modes de vista */}
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

                    {/* Excel Dropdown */}
                    <ExcelDropdownButton
                        options={excelOptions}
                        onSelect={handleExcelAction}
                        disabled={isExcelPending}
                    />

                    {/* Nou contacte (amb límit) */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span tabIndex={isLimitReached ? 0 : -1}>
                                    <ContactDialog
                                        trigger={
                                            <Button className="flex-shrink-0 w-full sm:w-auto" disabled={isLimitReached || isExcelPending}>
                                                {isLimitReached ? (
                                                    <Lock className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <Plus className="w-4 h-4 mr-1" />
                                                )}
                                                <span className="hidden md:inline">{t('newContactButton')}</span>
                                            </Button>
                                        }
                                        onContactSaved={() => {
                                            // 💡 3. SIMPLIFICAT
                                            // El 'router.refresh' actualitzarà 'initialContacts',
                                            // i l''useEffect' de dalt actualitzarà l'estat 'contacts'.
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
                    {/* 💡 CORRECCIÓ PAGINACIÓ: Canviat <Link> per <Button onClick> */}
                    <Button
                        disabled={currentPage <= 1}
                        size="sm"
                        className="px-3"
                        onClick={() => router.push(`/crm/contactes?page=${currentPage - 1}`)}
                    >
                        <span className="hidden md:inline">{t('pagination.previous')}</span>
                        <span className="md:hidden">←</span>
                    </Button>

                    <span className="text-sm text-muted-foreground">
                        {t('pagination.page', { currentPage, totalPages })}
                    </span>

                    {/* 💡 CORRECCIÓ PAGINACIÓ: Canviat <Link> per <Button onClick> */}
                    <Button
                        disabled={currentPage >= totalPages}
                        size="sm"
                        className="px-3"
                        onClick={() => router.push(`/crm/contactes?page=${currentPage + 1}`)}
                    >
                        <span className="hidden md:inline">{t('pagination.next')}</span>
                        <span className="md:hidden">→</span>
                    </Button>
                </div>
            )}
        </motion.div>
    );
};