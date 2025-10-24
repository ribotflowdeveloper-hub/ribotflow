// /app/[locale]/(app)/crm/quotes/_components/QuotesClient.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Edit, ArrowUpDown, Plus } from 'lucide-react'; 
import type { QuoteWithContact } from '../page';
import { useTranslations, useLocale } from 'next-intl';
import { QUOTE_STATUS_MAP } from '@/config/styles/quotes';
import { cn } from '@/lib/utils/utils';
import { useQuotes } from '../_hooks/useQuotes'; 

// MAPA DE CLASSES D'ESTAT MILLORAT PER AL CONTRAST
const TEXT_CONTRAST_MAP: Record<string, string> = {
    'bg-gray-100': 'text-gray-800',
    'bg-yellow-100': 'text-yellow-800',
    'bg-blue-100': 'text-blue-800',
    'bg-green-600': 'text-white',
    'bg-red-600': 'text-white',
};

export function QuotesClient({ initialQuotes }: { initialQuotes: QuoteWithContact[] }) {
    const t = useTranslations('QuotesPage');
    const locale = useLocale();

    const {
        isPending,
        quotes, 
        quoteToDelete,
        setQuoteToDelete,
        handleSort,
        handleDelete,
        searchParams,
    } = useQuotes({ initialQuotes, t });

    // Component intern per a les capçaleres ordenables, ara utilitza 'searchParams' del hook.
    const SortableHeader = ({ column, label }: { column: string, label: string }) => {
        const order = searchParams.get(`sortBy-${column}`);
        return (
            <TableHead onClick={() => handleSort(column)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                    {label}
                    {order ? (
                        <span className="text-foreground text-xs">{order === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground/30" />
                    )}
                </div>
            </TableHead>
        );
    };

    return (
        <>
            {/* Capçalera (Títol i Botó) */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Pressupostos</h1>
                <Button asChild>
                    <Link href={`/${locale}/crm/quotes/new`}>
                        <Plus className="w-4 h-4 mr-2" /> {t('newQuoteButton')} 
                    </Link>
                </Button>
            </div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("relative", isPending && "opacity-50 pointer-events-none")}>
                {isPending && (<div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"><Loader2 className="w-8 h-8 animate-spin" /></div>)}
                
                {/* Taula amb estil sòlid */}
                <div className="bg-card rounded-xl shadow-lg border border-border"> 
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {/* Les capçaleres per defecte ja tenen padding ajustat */}
                                <SortableHeader column="quote_number" label={t('table.number')} />
                                <SortableHeader column="contacts.nom" label={t('table.client')} />
                                <SortableHeader column="issue_date" label={t('table.issueDate')} />
                                <SortableHeader column="total" label={t('table.total')} />
                                <SortableHeader column="status" label={t('table.status')} />
                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.length > 0 ? quotes.map(quote => {
                                const statusInfo = QUOTE_STATUS_MAP.find(s => s.dbValue === quote.status) || { key: 'unknown', colorClass: 'bg-gray-100' };
                                const textClass = TEXT_CONTRAST_MAP[statusInfo.colorClass] || 'text-white';

                                // ✅ CLASSE base per a totes les cel·les: reduïm 'py-4' per defecte a 'py-1'
                                const BASE_CELL_CLASS = "py-1";

                                return (
                                    <TableRow key={quote.id}>
                                        {/* Reducció de padding vertical a 'py-2' */}
                                        <TableCell className={cn("font-medium", BASE_CELL_CLASS)}>{quote.quote_number || `PRE-${String(quote.id).substring(0, 6)}`}</TableCell>
                                        <TableCell className={BASE_CELL_CLASS}>{quote.contacts?.nom || t('noClient')}</TableCell>
                                        <TableCell className={BASE_CELL_CLASS}>{new Date(quote.issue_date).toLocaleDateString(locale)}</TableCell>
                                        <TableCell className={BASE_CELL_CLASS}>€{quote.total?.toLocaleString(locale, { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                                        
                                        {/* Cel·la d'Estat: també amb padding reduït */}
                                        <TableCell className={BASE_CELL_CLASS}>
                                            <span className={cn(
                                                "px-2 py-1 text-xs font-medium rounded-full",
                                                statusInfo.colorClass,
                                                textClass,
                                                "min-w-[70px] inline-flex justify-center" 
                                            )}>
                                                {t(`status.${statusInfo.key}`)}
                                            </span>
                                        </TableCell>
                                        
                                        {/* Cel·la d'Accions: alineació a la dreta i padding reduït */}
                                        <TableCell className={cn("text-right", BASE_CELL_CLASS)}>
                                            <Link href={`/${locale}/crm/quotes/${quote.id}`} className="inline-flex items-center justify-center h-8 w-8" title={t('actions.edit')}>
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <Button variant="ghost" size="icon" title={t('actions.delete')} onClick={() => setQuoteToDelete(quote)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">{t('emptyState')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </motion.div>

            {/* AlertDialog (sense canvis) */}
            <AlertDialog open={!!quoteToDelete} onOpenChange={() => setQuoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('deleteDialog.description1')} <span className="font-bold">{quoteToDelete?.quote_number}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>{t('deleteDialog.cancelButton')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isPending ? t('deleteDialog.deleting') : t('deleteDialog.confirmButton')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}