// @/app/[locale]/(app)/crm/contactes/_components/ContactsClient.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, LayoutGrid, List, Lock } from 'lucide-react';

import { type ContactWithOpportunities } from '@/types/db';
import { CONTACT_STATUS_MAP } from '@/config/contacts';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
import { useContactFilters } from '../_hooks/useContactFilters';

import { ContactDialog } from './ContactDialog';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';
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
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hook per als filtres estrictes (sort, status, view)
    const { sortBy, statusFilter, viewMode, handleFilterChange } = useContactFilters(initialViewMode);

    // Estat local per al input de cerca (per permetre escriure sense recarregar a cada lletra)
    const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');

    // Sincronitzem l'estat local si la URL canvia externament
    useEffect(() => {
        setLocalSearch(searchParams.get('q') || '');
    }, [searchParams]);

    const isLimitReached = !limitStatus.allowed;

    // Gestió de l'Excel
    const {
        isPending: isExcelPending,
        excelOptions,
        handleExcelAction
    } = useExcelActions({
        tableName: 'contacts',
        limitStatus: limitStatus,
        translationKeys: {
            create: 'contacts.create',
            load: 'contacts.load',
            download: 'contacts.download',
            limit: 'contacts',
        }
    });

    const handleContactClick = (contact: ContactWithOpportunities) => {
        router.push(`/crm/contactes/${contact.id}`);
    };

    // --- GESTIÓ MANUAL D'URL (SEARCH I PAGINACIÓ) ---
    // Això soluciona l'error de TypeScript amb FilterType
    
    const updateUrlParam = (key: string, value: string) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        
        if (value) {
            current.set(key, value);
        } else {
            current.delete(key);
        }

        // Si cerquem, sempre reiniciem a la pàgina 1
        if (key === 'q') {
            current.set('page', '1');
        }

        const search = current.toString();
        const query = search ? `?${search}` : "";
        router.push(`${pathname}${query}`);
    };

    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalSearch(val);
        // Si l'usuari esborra tot, actualitzem la URL immediatament
        if (val === '') updateUrlParam('q', '');
    };

    const onSearchSubmit = () => {
        updateUrlParam('q', localSearch);
    };

    const handlePageChange = (newPage: number) => {
        updateUrlParam('page', String(newPage));
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            {/* HEADER */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-balance">{t('title')}</h1>

                <div className="flex flex-wrap gap-2 w-full items-center">
                    {/* CERCADOR */}
                    <div className="relative flex-grow min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            className="pl-9 w-full"
                            value={localSearch}
                            onChange={onSearchChange}
                            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                            onBlur={onSearchSubmit} // Opcional: Cercar en perdre el focus
                        />
                    </div>

                    {/* ORDENAR (Usa el Hook) */}
                    <Select value={sortBy} onValueChange={(value) => handleFilterChange('sort', value)}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder={t('filters.sortBy')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t('filters.newest')}</SelectItem>
                            <SelectItem value="oldest">{t('filters.oldest')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* ESTAT (Usa el Hook) */}
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

                    {/* VISTA (Usa el Hook) */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFilterChange('view', 'cards')}>
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFilterChange('view', 'list')}>
                            <List className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* EXCEL */}
                    <ExcelDropdownButton
                        options={excelOptions}
                        onSelect={handleExcelAction}
                        disabled={isExcelPending}
                    />

                    {/* NOU CONTACTE */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span tabIndex={isLimitReached ? 0 : -1} className="inline-flex">
                                    <ContactDialog
                                        trigger={
                                            <Button className="flex-shrink-0 w-full sm:w-auto" disabled={isLimitReached || isExcelPending}>
                                                {isLimitReached ? <Lock className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                                <span className="hidden md:inline">{t('newContactButton')}</span>
                                            </Button>
                                        }
                                        onContactSaved={() => router.refresh()}
                                        isLimitReached={isLimitReached}
                                        limitError={limitStatus.error}
                                    />
                                </span>
                            </TooltipTrigger>
                            {isLimitReached && (
                                <TooltipContent className="bg-destructive text-destructive-foreground">
                                    <p>{t_billing('limitReachedTitle')}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* CONTINGUT */}
            <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                <AnimatePresence mode="wait">
                    <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {initialContacts.length > 0 ? (
                            viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                    {initialContacts.map(contact => (
                                        <ContactCard key={contact.id} contact={contact} onClick={() => handleContactClick(contact)} />
                                    ))}
                                </div>
                            ) : (
                                <ContactTable contacts={initialContacts} onRowClick={handleContactClick} />
                            )
                        ) : (
                            <div className="text-center py-16 text-muted-foreground">{t('noContactsFound')}</div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* PAGINACIÓ */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 flex-shrink-0">
                    <Button
                        variant="outline"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                    >
                        {t('pagination.previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {t('pagination.page', { currentPage, totalPages })}
                    </span>
                    <Button
                        variant="outline"
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                    >
                        {t('pagination.next')}
                    </Button>
                </div>
            )}
        </motion.div>
    );
};