// /app/finances/facturacio/_components/FacturacioClient.tsx
"use client";

import React, { useState, useTransition, useMemo } from 'react';
// ✅ 1. Importem els hooks de Next.js per a la navegació
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, ShieldCheck, ArrowUpDown } from 'lucide-react'; // ✅ Afegim ArrowUpDown
import { format } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";
import type { Invoice, Contact } from '@/types/finances/index';
import { deleteInvoiceAction, issueInvoiceAction } from '../actions';
import { InvoiceDialog } from './InvoiceDialog';
import { useTranslations, useLocale } from 'next-intl';
import { INVOICE_STATUS_MAP } from '@/types/finances/index';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from '@/types/crm/products';

export function FacturacioClient({ initialInvoices, initialContacts, initialProducts }: {
    initialInvoices: Invoice[];
    initialContacts: Contact[];
    initialProducts: Product[]; // ✅ AFEGEIX AQUESTA LÍNIA

}) {
    // ✅ 2. Inicialitzem els hooks de navegació
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isSaving, startSaveTransition] = useTransition();
    const t = useTranslations('InvoicingPage');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice> | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [invoiceToIssue, setInvoiceToIssue] = useState<Invoice | null>(null);
    // ✅ TOTA LA LÒGICA DE FILTRATGE I ORDENACIÓ PASSA AQUÍ
    const filteredAndSortedInvoices = useMemo(() => {
        let result: Invoice[] = [...initialInvoices];

        // 1. Filtrar
        const status = searchParams.get('status');
        if (status) {
            result = result.filter(invoice => invoice.status === status);
        }

        // 2. Ordenar
        const sortBy = searchParams.get('sortBy');
        const order = searchParams.get('order');

        if (sortBy && order) {
            result.sort((a, b) => {
                const aValue = sortBy.includes('.') ? a.contacts?.nom : a[sortBy as keyof Invoice];
                const bValue = sortBy.includes('.') ? b.contacts?.nom : b[sortBy as keyof Invoice];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) return order === 'asc' ? -1 : 1;
                if (aValue > bValue) return order === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [initialInvoices, searchParams]);

    console.log("[CLIENT] Component FacturacioClient renderitzat amb", initialInvoices.length, "factures inicials.");

    // ✅ 3. Funció per actualitzar la URL amb nous paràmetres
    const updateSearchParams = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    // ✅ 4. Funció per gestionar l'ordenació
    // ✅ LÒGICA D'ORDENACIÓ REESCRITA
    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const currentSortBy = params.get('sortBy');
        const currentOrder = params.get('order');

        if (currentSortBy === column && currentOrder === 'desc') {
            // Si ja està ordenat per aquesta columna de forma descendent, ho pugem a ascendent.
            params.set('order', 'asc');
        } else if (currentSortBy === column && currentOrder === 'asc') {
            // Si ja era ascendent, eliminem l'ordenació per tornar a la per defecte.
            params.delete('sortBy');
            params.delete('order');
        } else {
            // Si no estava ordenat per aquesta columna, ho posem descendent per defecte.
            params.set('sortBy', column);
            params.set('order', 'desc');
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    // ✅ 5. Component per a les capçaleres de la taula que permeten ordenar
    // ✅ CAPÇALERA DE TAULA REESCRITA
    const SortableHeader = ({ column, label }: { column: string, label: string }) => {
        const sortBy = searchParams.get('sortBy');
        const order = searchParams.get('order');
        const isActive = sortBy === column;

        return (
            <TableHead onClick={() => handleSort(column)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                    {label}
                    {isActive ? (
                        <span className="text-foreground text-xs">{order === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground/30" />
                    )}
                </div>
            </TableHead>
        );
    };


    /**
     * Obre el diàleg per crear un nou esborrany o editar-ne un d'existent.
     * Només permet editar factures que estiguin en estat 'Draft'.
     */
    const handleOpenForm = (invoice: Invoice | null = null) => {
        if (invoice && invoice.status !== 'Draft') {
            toast.info(t('toast.notAllowed'), { description: t('toast.notAllowedDesc') });
            return;
        }
        // Si estem creant una nova factura, proporcionem valors per defecte.
        setEditingInvoice(invoice ? { ...invoice } : {
            status: 'Draft',
            issue_date: new Date().toISOString(),
            due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
            invoice_items: [{ description: '', quantity: 1, unit_price: 0 }]
        });
        setIsFormOpen(true);
    };

    /**
     * Funció de callback que s'executa quan el diàleg d'edició es desa amb èxit.
     * Tanca el diàleg i refresca les dades de la pàgina.
     */
    const handleSaveSuccess = () => {
        setIsFormOpen(false);
        setEditingInvoice(null);
        router.refresh(); // Crida a Next.js per tornar a carregar les dades del servidor.
    };

    /**
     * Crida la Server Action per emetre una factura legal (Veri*factu).
     */
    const handleIssueInvoice = () => {
        if (!invoiceToIssue) return;
        startSaveTransition(async () => {
            const result = await issueInvoiceAction(invoiceToIssue.id);
            if (result?.success) {
                toast.success(t('toast.issueSuccess'), { description: t('toast.issueSuccessDesc', { invoiceNumber: result.invoice?.invoice_number }) });
                setInvoiceToIssue(null);
                router.refresh();
            } else {
                if (result) {
                    toast.error(t('toast.issueError'), { description: result.message });
                }
            }
        });
    };

    /**
     * Crida la Server Action per eliminar un esborrany de factura.
     */
    const handleDelete = () => {
        if (!invoiceToDelete) return;
        startSaveTransition(async () => {
            const result = await deleteInvoiceAction(invoiceToDelete.id);
            if (result.success) {
                toast.success(t('toast.deleteSuccess'), { description: result.message });
                setInvoiceToDelete(null);
                router.refresh();
            } else {
                toast.error(t('toast.deleteError'), { description: result.message });
            }
        });
    };

    /**
     * Funció utilitària per retornar classes de CSS segons l'estat de la factura,
     * permetent acolorir les etiquetes d'estat a la taula.
     */


    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            {/* ✅ Contenidor principal per al títol i les accions */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{t('title')}</h1>

                {/* ✅ Contenidor per als controls de la dreta (filtre i botó) */}
                <div className="flex items-center gap-4">

                    {/* ✨ El nou filtre amb disseny millorat ✨ */}
                    <Select
                        onValueChange={(value) => updateSearchParams('status', value === 'all' ? null : value)}
                        defaultValue={searchParams.get('status') || 'all'}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('filterByStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allStatuses')}</SelectItem>
                            {INVOICE_STATUS_MAP.map(status => (
                                <SelectItem key={status.dbValue} value={status.dbValue}>
                                    {t(`statuses.${status.key}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => handleOpenForm()}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('newDraftButton')}
                    </Button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <Table>
                    {/* ✅ 7. Utilitzem el nou component SortableHeader */}
                    <TableHeader><TableRow>
                        <SortableHeader column="invoice_number" label={t('table.invoiceNo')} />
                        <SortableHeader column="contacts.nom" label={t('table.client')} />
                        <SortableHeader column="issue_date" label={t('table.issueDate')} />
                        <SortableHeader column="total_amount" label={t('table.amount')} />
                        <SortableHeader column="status" label={t('table.status')} />
                        <TableHead className="text-right">{t('table.actions')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {/* La resta del teu codi de la taula ja era correcte, perquè feia .map sobre initialInvoices */}
                        {filteredAndSortedInvoices.length > 0 ? (
                            filteredAndSortedInvoices.map(invoice => {
                                const statusInfo = INVOICE_STATUS_MAP.find(s => s.dbValue === invoice.status);
                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoice_number || t('statuses.draft')}</TableCell>
                                        <TableCell>{invoice.contacts?.nom || t('noClient')}</TableCell>
                                        <TableCell>{format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: dateLocale })}</TableCell>
                                        <TableCell>€{(invoice.total_amount || 0).toLocaleString(locale, { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.colorClass || ''}`}>
                                                {statusInfo ? t(`statuses.${statusInfo.key}`) : (invoice.status || t('statuses.unknown'))}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* ✅ CORRECCIÓ: Estructura neta per a la cel·la d'accions */}
                                            {invoice.status === 'Draft' ? (
                                                <div className="flex justify-end items-center gap-1">
                                                    <Button size="sm" variant="outline" className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30" onClick={() => setInvoiceToIssue(invoice)}>
                                                        <ShieldCheck className="w-4 h-4 mr-2" />{t('issueButton')}
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenForm(invoice)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => setInvoiceToDelete(invoice)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                // Per a factures no editables, podem mostrar un botó de "Veure" o simplement res.
                                                // Deixar la cel·la buida és segur.
                                                null
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">{t('emptyState')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {isFormOpen && editingInvoice && (
                <InvoiceDialog
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    contacts={initialContacts}
                    products={initialProducts} // ✅ Passem la nova prop
                    initialInvoice={editingInvoice}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}
            <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle><AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t('deleteDialog.cancelButton')}</AlertDialogCancel><AlertDialogAction className="bg-destructive..." onClick={handleDelete}>{t('deleteDialog.confirmButton')}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!invoiceToIssue} onOpenChange={() => setInvoiceToIssue(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t('issueDialog.title')}</AlertDialogTitle><AlertDialogDescription>{t('issueDialog.description')}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={isSaving}>{t('deleteDialog.cancelButton')}</AlertDialogCancel><AlertDialogAction className="bg-purple-600..." onClick={handleIssueInvoice} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('issueDialog.confirmButton')}
                    </AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}