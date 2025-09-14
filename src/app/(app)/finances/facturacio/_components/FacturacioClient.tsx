"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, ShieldCheck } from 'lucide-react'; // ✅ Importem ShieldCheck
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import type { Invoice, Contact } from '../page';
import { deleteInvoiceAction, issueInvoiceAction } from '../actions';
import { InvoiceDialog } from './InvoiceDialog';

export function FacturacioClient({ initialInvoices, initialContacts }: {
    initialInvoices: Invoice[];
    initialContacts: Contact[];
}) {
    const router = useRouter();
    const [isSaving, startSaveTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice> | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [invoiceToIssue, setInvoiceToIssue] = useState<Invoice | null>(null);

    const handleOpenForm = (invoice: Invoice | null = null) => {
        if (invoice && invoice.status !== 'Draft') {
            toast.info("Acció no permesa", { description: "Les factures emeses o pagades no es poden editar." });
            return;
        }
        setEditingInvoice(invoice ? { ...invoice } : { 
            status: 'Draft', 
            issue_date: new Date().toISOString(),
            due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
            invoice_items: [{ description: '', quantity: 1, unit_price: 0 }] 
        });
        setIsFormOpen(true);
    };

    const handleSaveSuccess = () => {
        setIsFormOpen(false);
        setEditingInvoice(null);
        router.refresh();
    };

    const handleIssueInvoice = () => {
        if (!invoiceToIssue) return;
        startSaveTransition(async () => {
            const result = await issueInvoiceAction(invoiceToIssue.id);
            if (result.success) {
                toast.success('Factura Emesa Correctament!', { description: `S'ha generat la factura legal ${result.invoice?.invoice_number}.` });
                setInvoiceToIssue(null);
                router.refresh();
            } else {
                toast.error('Error en emetre la factura', { description: result.message });
            }
        });
    };

    const handleDelete = () => {
        if (!invoiceToDelete) return;
        startSaveTransition(async () => {
            const result = await deleteInvoiceAction(invoiceToDelete.id);
            if (result.success) {
                toast.success('Èxit!', { description: result.message });
                setInvoiceToDelete(null);
                router.refresh();
            } else {
                toast.error('Error en eliminar', { description: result.message });
            }
        });
    };
    
    const getStatusClass = (status: string | null) => {
        switch(status?.toLowerCase()) {
            case 'issued': return 'bg-purple-500/10 text-purple-400 border border-purple-400/30';
            case 'paid': return 'bg-green-500/10 text-green-400 border border-green-400/30';
            case 'overdue': return 'bg-red-500/10 text-red-400 border border-red-400/30';
            case 'draft': return 'bg-gray-500/10 text-gray-400 border border-gray-400/30';
            default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-400/30';
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Facturació</h1>
                <Button onClick={() => handleOpenForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Nou Esborrany
                </Button>
            </div>
            
            <div className="glass-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nº Factura</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Data Emissió</TableHead>
                            <TableHead>Import</TableHead>
                            <TableHead>Estat</TableHead>
                            <TableHead className="text-right">Accions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialInvoices && initialInvoices.length > 0 ? (
                            initialInvoices.map(invoice => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoice_number || 'Esborrany'}</TableCell>
                                    <TableCell>{invoice.contacts?.nom || 'N/A'}</TableCell>
                                    <TableCell>{format(new Date(invoice.issue_date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>€{(invoice.total_amount || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(invoice.status)}`}>{invoice.status}</span></TableCell>
                                    <TableCell className="text-right">
                                        {/* ✅ LÒGICA I BOTONS AFEGITS */}
                                        {invoice.status === 'Draft' ? (
                                            <>
                                                   <Button size="sm" variant="outline" className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30" onClick={() => setInvoiceToIssue(invoice)}>
                                                <ShieldCheck className="w-4 h-4 mr-2" />Emetre
                                            </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleOpenForm(invoice)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => setInvoiceToDelete(invoice)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button size="icon" variant="ghost" disabled>
                                                {/* Pots afegir un botó de 'Veure' o similar aquí si vols */}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Encara no has creat cap factura.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {isFormOpen && editingInvoice && (
                <InvoiceDialog
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    contacts={initialContacts}
                    initialInvoice={editingInvoice}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}
            
            <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
                {/* ... (Contingut del diàleg per eliminar no canvia) ... */}
            </AlertDialog>

            <AlertDialog open={!!invoiceToIssue} onOpenChange={() => setInvoiceToIssue(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emetre Factura Legal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Aquesta acció és irreversible. Es generarà una factura legal amb número oficial. Un cop emesa, no podràs editar-la ni eliminar-la.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleIssueInvoice} className="bg-purple-600 hover:bg-purple-700" disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Sí, emetre factura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}