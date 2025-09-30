"use client";

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Edit, ArrowUpDown } from 'lucide-react';
import type { QuoteWithContact } from '../page';
import { deleteQuoteAction } from '../actions';
import { useTranslations, useLocale } from 'next-intl';
import { QUOTE_STATUS_MAP } from '@/types/crm';
import { cn } from '@/lib/utils/utils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // <-- Importa els hooks correctes

// ATENCIÓ: Ja no necessites 'sortQuotesAction' ni 'useTransition' per a això.
// Pots eliminar la importació.

export function QuotesClient({ initialQuotes }: { initialQuotes: QuoteWithContact[] }) {



    // ✅ L'estat d'ordenació per a controlar les fletxes.
    const t = useTranslations('QuotesPage');
    const locale = useLocale();

    // Hooks de Next.js per gestionar la URL
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // L'estat local 'quotes' ja no és necessari, la pàgina es recarregarà sola.
    // const [quotes, setQuotes] = useState<QuoteWithContact[]>(initialQuotes);
    const [isPending, startTransition] = useTransition();

    const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithContact | null>(null);

    // ✅ LÒGICA SIMPLIFICADA PER CANVIAR LA URL
    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const currentOrder = params.get(`sortBy-${column}`);

        // Esborrem tots els altres paràmetres d'ordenació per mantenir-ho simple (o pots fer-ho multi-sort si vols)
        params.forEach((_, key) => {
            if (key.startsWith('sortBy-')) {
                params.delete(key);
            }
        });

        let newOrder;
        if (currentOrder === 'desc') {
            newOrder = 'asc';
        } else {
            // Si és 'asc' o no existeix, el posem a 'desc'
            newOrder = 'desc';
        }

        params.set(`sortBy-${column}`, newOrder);

        // Naveguem a la nova URL. Next.js s'encarregarà de la resta.
        router.push(`${pathname}?${params.toString()}`);
    };


    const SortableHeader = ({ column, label }: { column: string, label: string }) => {
        // Obtenim l'ordenació directament dels searchParams
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

    /**
     * @summary Gestor per a l'eliminació d'un pressupost. S'executa quan l'usuari confirma al diàleg.
     */
    const handleDelete = () => {
        if (!quoteToDelete) return;

        // 'startTransition' embolcalla l'acció asíncrona. Mentre s'executa, 'isPending' serà true.
        startTransition(async () => {
            const result = await deleteQuoteAction(quoteToDelete.id); // Cridem a la Server Action.
            if (result.success) {
                toast.success('Èxit!', { description: result.message });
            } else {
                toast.error('Error', { description: result.message });
            }
            setQuoteToDelete(null); // Tanquem el diàleg un cop finalitzada l'acció.
        });
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("relative", isPending && "opacity-50 pointer-events-none")}>
                {isPending && (<div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"><Loader2 className="w-8 h-8 animate-spin" /></div>)}
                <div className="glass-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <SortableHeader column="quote_number" label={t('table.number')} />
                                <SortableHeader column="contacts.nom" label={t('table.client')} />
                                <SortableHeader column="issue_date" label={t('table.issueDate')} />
                                <SortableHeader column="total" label={t('table.total')} />
                                <SortableHeader column="status" label={t('table.status')} />
                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* ✅ AQUEST ERA L'ERROR FATAL.
                            Estàvem fent '.map' sobre 'initialQuotes', que són les dades originals i mai canvien.
                            Hem de fer '.map' sobre 'quotes', que és la variable d'estat que actualitzem
                            amb les dades ordenades que rebem del servidor.
                        */}
                            {initialQuotes.length > 0 ? initialQuotes.map(quote => {
                                const statusInfo = QUOTE_STATUS_MAP.find(s => s.dbValue === quote.status)
                                    || { key: 'unknown', colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
                                return (
                                    <TableRow key={quote.id}>
                                        <TableCell className="font-medium">{quote.quote_number || `PRE-${quote.id.substring(0, 6)}`}</TableCell>
                                        <TableCell>{quote.contacts?.nom || t('noClient')}</TableCell>
                                        <TableCell>{new Date(quote.issue_date).toLocaleDateString(locale)}</TableCell>
                                        <TableCell>€{quote.total?.toLocaleString(locale, { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.colorClass}`}>
                                                {t(`status.${statusInfo.key}`)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/crm/quotes/${quote.id}`} className="inline-flex items-center justify-center h-8 w-8" title={t('actions.edit')}>
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
                                    <TableCell colSpan={6} className="text-center h-24">
                                        {t('emptyState')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <AlertDialog open={!!quoteToDelete} onOpenChange={() => setQuoteToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('deleteDialog.description1')}
                                <span className="font-bold"> {quoteToDelete?.quote_number}</span>.
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
            </motion.div>
        </>
    );
};