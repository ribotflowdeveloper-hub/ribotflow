"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
// Framer Motion per a animacions d'entrada.
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, ShieldCheck } from 'lucide-react';
// 'date-fns' per a un format de dates robust i localitzat.
import { format } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";
// Importem els tipus de dades i les accions del servidor.
import type { Invoice, Contact } from '../types'; // ✅ Importamos desde el nuevo fichero de tipos
import { deleteInvoiceAction, issueInvoiceAction } from '../actions';
// Importem el component dedicat per al diàleg d'edició.
import { InvoiceDialog } from './InvoiceDialog';
import { useTranslations, useLocale } from 'next-intl';
import { INVOICE_STATUS_MAP } from '../types'; // ✅ Importamos el mapa


/**
 * Component de Client principal per a la pàgina de Facturació.
 * S'encarrega de:
 * - Renderitzar la llista de factures.
 * - Gestionar l'estat per obrir els diàlegs (crear/editar, eliminar, emetre).
 * - Cridar les Server Actions corresponents a les accions de l'usuari.
 */
export function FacturacioClient({ initialInvoices, initialContacts }: {
    initialInvoices: Invoice[];
    initialContacts: Contact[];
}) {
    const router = useRouter(); // Hook de Next.js per a la navegació i el refresc de dades.
    const [isSaving, startSaveTransition] = useTransition(); // Estat de càrrega per a operacions (eliminar, emetre).
    const t = useTranslations('InvoicingPage');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;

    // Estats per controlar la visibilitat dels diàlegs i les dades que gestionen.
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice> | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [invoiceToIssue, setInvoiceToIssue] = useState<Invoice | null>(null);

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
            if (result.success) {
                toast.success(t('toast.issueSuccess'), { description: t('toast.issueSuccessDesc', { invoiceNumber: result.invoice?.invoice_number }) });
                setInvoiceToIssue(null);
                router.refresh();
            } else {
                toast.error(t('toast.issueError'), { description: result.message });
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <Button onClick={() => handleOpenForm()}><Plus className="w-4 h-4 mr-2" />{t('newDraftButton')}</Button>
            </div>
            
            <div className="glass-card overflow-hidden">
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>{t('table.invoiceNo')}</TableHead><TableHead>{t('table.client')}</TableHead>
                        <TableHead>{t('table.issueDate')}</TableHead><TableHead>{t('table.amount')}</TableHead>
                        <TableHead>{t('table.status')}</TableHead><TableHead className="text-right">{t('table.actions')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {initialInvoices?.length > 0 ? (
                            initialInvoices.map(invoice => {
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
                            )})
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">{t('emptyState')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {isFormOpen && editingInvoice && (<InvoiceDialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} contacts={initialContacts} initialInvoice={editingInvoice} onSaveSuccess={handleSaveSuccess} />)}
            
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