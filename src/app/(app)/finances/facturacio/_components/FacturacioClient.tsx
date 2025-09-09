// Ruta: src/app/(app)/finances/facturacio/_components/FacturacioClient.tsx
// REEMPLAÇA EL TEU FITXER SENCER AMB AQUEST CODI

"use client";

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Calendar as CalendarIcon, Check, ChevronsUpDown, Edit, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import type { Invoice, Contact } from '../page';
import { createOrUpdateInvoiceAction, deleteInvoiceAction } from '../actions';
import { type InvoiceFormData } from '../actions';

const InvoiceForm = ({ invoice, setInvoice, contacts, onSave, isSaving, onClose }: {
    invoice: Partial<Invoice>;
    setInvoice: React.Dispatch<React.SetStateAction<Partial<Invoice> | null>>;
    contacts: Contact[];
    onSave: () => void;
    isSaving: boolean;
    onClose: () => void;
}) => {
    const selectedContact = contacts.find(c => c.id === invoice.contact_id);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid gap-6 pt-4">
            <div className="space-y-2">
                <Label>Client</Label>
                <Popover>
                    <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal">{selectedContact ? selectedContact.nom : "Selecciona un client..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect">
                        <Command><CommandInput placeholder="Buscar client..." /><CommandList><CommandEmpty>No s'ha trobat cap client.</CommandEmpty><CommandGroup>
                            {contacts.map((contact) => (
                                <CommandItem key={contact.id} value={contact.nom} onSelect={() => setInvoice(prev => prev ? ({...prev, contact_id: contact.id}) : null)}>
                                    <Check className={cn("mr-2 h-4 w-4", invoice.contact_id === contact.id ? "opacity-100" : "opacity-0")} />{contact.nom}
                                </CommandItem>
                            ))}
                        </CommandGroup></CommandList></Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label>Data d'Emissió</Label>
                <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal search-input", !invoice.issue_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{invoice.issue_date ? format(new Date(invoice.issue_date), "PPP", { locale: ca }) : <span>Tria una data</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                            mode="single"
                            selected={invoice.issue_date ? new Date(invoice.issue_date) : undefined}
                            // ✅ CORRECCIÓ: Utilitzem el tipus correcte (Date | undefined) que ens proporciona el component.
                            onSelect={(date: Date | undefined) => setInvoice(p => p ? { ...p, issue_date: date?.toISOString() } : null)} className={undefined} classNames={undefined} formatters={undefined} components={undefined}                        // ✅ CORRECCIÓ: Hem eliminat totes les propietats redundants que tenien 'undefined'.
                    />                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label>Import Total (€)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={invoice.total_amount || ''} onChange={(e) => setInvoice(p => p ? ({...p, total_amount: parseFloat(e.target.value) || undefined}) : null)} className="search-input" />
            </div>
            <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel·lar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{invoice.id ? "Actualitzar" : "Desar Factura"}</Button>
            </DialogFooter>
        </form>
    );
};

export function FacturacioClient({ initialInvoices, initialContacts }: {
    initialInvoices: Invoice[];
    initialContacts: Contact[];
}) {
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice> | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

    const handleOpenForm = (invoice: Invoice | null = null) => {
        setEditingInvoice(invoice ? invoice : { issue_date: new Date().toISOString(), status: 'Draft' });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingInvoice(null);
    };

    const handleSave = () => {
        if (!editingInvoice) return;

        if (!editingInvoice.contact_id || !editingInvoice.issue_date || editingInvoice.total_amount === undefined || !editingInvoice.status) {
             toast({ variant: 'destructive', title: 'Camps incomplets', description: 'Si us plau, omple tots els camps requerits.' });
            return;
        }

        const invoiceDataToSend: InvoiceFormData = {
            id: editingInvoice.id,
            contact_id: editingInvoice.contact_id,
            issue_date: editingInvoice.issue_date,
            total_amount: editingInvoice.total_amount,
            status: editingInvoice.status as InvoiceFormData['status'],
        };

        startSaveTransition(async () => {
            const result = await createOrUpdateInvoiceAction(invoiceDataToSend);
            if (result.success) {
                toast({ title: 'Èxit!', description: result.message });
                handleCloseForm();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleDelete = () => {
        if (!invoiceToDelete) return;
        startSaveTransition(async () => {
            const result = await deleteInvoiceAction(invoiceToDelete.id);
            if (result.success) {
                toast({ title: 'Èxit!', description: result.message });
                setInvoiceToDelete(null);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };
    
    const getStatusClass = (status: string) => {
        switch(status.toLowerCase()) {
            case 'paid': return 'bg-green-500/10 text-green-400 border border-green-400/30';
            case 'sent': return 'bg-blue-500/10 text-blue-400 border border-blue-400/30';
            case 'overdue': return 'bg-red-500/10 text-red-400 border border-red-400/30';
            default: return 'bg-gray-500/10 text-gray-400 border border-gray-400/30';
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Facturació</h1>
                <Button onClick={() => handleOpenForm()}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Factura
                </Button>
            </div>
            
            <div className="glass-card overflow-hidden">
                <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Data Emissió</TableHead><TableHead>Import</TableHead><TableHead>Estat</TableHead><TableHead className="text-right">Accions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {initialInvoices.map(invoice => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.contacts?.nom || 'N/A'}</TableCell>
                                <TableCell>{format(new Date(invoice.issue_date), "dd/MM/yyyy")}</TableCell>
                                <TableCell>€{(invoice.total_amount || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(invoice.status)}`}>{invoice.status}</span></TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenForm(invoice)}><Edit className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => setInvoiceToDelete(invoice)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="glass-effect">
                    <DialogHeader><DialogTitle className="text-2xl">{editingInvoice?.id ? "Editar Factura" : "Crear Nova Factura"}</DialogTitle></DialogHeader>
                    {editingInvoice && <InvoiceForm invoice={editingInvoice} setInvoice={setEditingInvoice} contacts={initialContacts} onSave={handleSave} isSaving={isSaving} onClose={handleCloseForm} />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Estàs segur?</AlertDialogTitle><AlertDialogDescription>Aquesta acció no es pot desfer. S'esborrarà permanentment la factura.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Sí, esborra-la</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}