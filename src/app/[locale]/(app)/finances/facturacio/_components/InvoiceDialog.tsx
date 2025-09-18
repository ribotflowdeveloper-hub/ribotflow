"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Plus, Trash2, Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { format } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";import { cn } from "@/lib/utils";
import { type Invoice, type Contact, type InvoiceItem } from '../types'; // ✅ Importamos desde el nuevo fichero de tipos
import { createOrUpdateInvoiceAction, type InvoiceFormData } from '../actions';
import { useTranslations, useLocale } from 'next-intl';

/**
 * Definim les propietats (props) que el nostre component de diàleg necessita per funcionar.
 */
interface InvoiceDialogProps {
    isOpen: boolean; // Controla si el diàleg és visible.
    onClose: () => void; // Funció per tancar el diàleg des del component pare.
    contacts: Contact[]; // Llista de contactes disponibles per al selector.
    initialInvoice: Partial<Invoice>; // Dades inicials de la factura (pot ser un objecte parcial per a una nova factura).
    onSaveSuccess: () => void; // Funció a executar quan la factura es desa correctament.
}

/**
 * Aquest component gestiona el diàleg complet per crear o editar un esborrany de factura.
 * Inclou la selecció de client, dates, gestió dinàmica de conceptes i càlculs automàtics.
 */
export function InvoiceDialog({ isOpen, onClose, contacts, initialInvoice, onSaveSuccess }: InvoiceDialogProps) {
    const t = useTranslations('InvoicingPage.formDialog');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;
    // Estat local per a les dades de la factura que s'està editant.
    const [invoice, setInvoice] = useState(initialInvoice);
    // Estat de transició per mostrar un indicador de càrrega mentre es desa.
    const [isSaving, startSaveTransition] = useTransition();
    // Estat per controlar la visibilitat del selector de contactes.
    const [comboboxOpen, setComboboxOpen] = useState(false);

    /**
     * Aquest 'useEffect' s'executa cada cop que la llista de conceptes ('invoice_items') canvia.
     * La seva funció és recalcular automàticament el subtotal, els impostos i el total,
     * mantenint les dades sempre sincronitzades i evitant errors de càlcul manuals.
     */
    useEffect(() => {
        const items = invoice.invoice_items || [];
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0);
        const taxAmount = subtotal * 0.21; // Assumim un 21% d'IVA per defecte.
        const totalAmount = subtotal + taxAmount;
        setInvoice(prev => ({ ...prev, subtotal, tax_amount: taxAmount, total_amount: totalAmount }));
    }, [invoice.invoice_items]);

    /**
     * Funcions per a la gestió dinàmica dels conceptes de la factura.
     */
    // Actualitza un camp específic d'un concepte existent.
    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const updatedItems = [...(invoice.invoice_items || [])];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setInvoice(prev => ({ ...prev, invoice_items: updatedItems }));
    };
    // Afegeix una nova línia de concepte buida.
    const addItem = () => {
        const newItem: InvoiceItem = { description: '', quantity: 1, unit_price: 0 };
        setInvoice(prev => ({ ...prev, invoice_items: [...(prev.invoice_items || []), newItem] }));
    };
    // Elimina una línia de concepte per la seva posició.
    const removeItem = (index: number) => {
        setInvoice(prev => ({ ...prev, invoice_items: (prev.invoice_items || []).filter((_, i) => i !== index) }));
    };

    /**
     * S'executa en clicar el botó de desar.
     * Valida les dades, les prepara per a l'enviament i crida la Server Action.
     */
    const handleSave = () => {
        // Validació del costat del client per a una resposta ràpida.
        if (!invoice.contact_id || !invoice.issue_date) {
            toast.error(t('toast.missingData'), { description: t('toast.missingDataDesc') });
            return;
        }
        
        // Construïm un objecte de dades segur que compleix amb el 'contracte' (InvoiceFormData)
        // que espera la nostra Server Action.
        const invoiceDataToSend: InvoiceFormData = {
            id: invoice.id,
            contact_id: invoice.contact_id,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date || null,
            status: 'Draft',
            subtotal: invoice.subtotal ?? 0,
            tax_amount: invoice.tax_amount ?? 0,
            total_amount: invoice.total_amount ?? 0,
            notes: invoice.notes || null,
            invoice_items: invoice.invoice_items || [],
        };
        
        startSaveTransition(async () => {
            const result = await createOrUpdateInvoiceAction(invoiceDataToSend);
            if (result.success) {
                toast.success(t('toast.success'), { description: result.message });
                onSaveSuccess();
            } else {
                toast.error(t('toast.error'), { description: result.message });
            }
        });
    };
    
    const selectedContact = contacts.find(c => c.id === invoice.contact_id);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* ✅ CORRECCIÓN: DialogContent ya es adaptable. Eliminamos 'glass-effect'. */}
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{invoice.id ? t('editTitle') : t('createTitle')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto pr-4 -mr-6 space-y-6 py-4">
                    {/* ✅ AQUÍ ESTÀ EL CONTINGUT COMPLET DEL FORMULARI */}
                    
                    {/* Dades del client i dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                        <Label>{t('clientLabel')}</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between text-left font-normal">{selectedContact ? selectedContact.nom :  t('selectClientPlaceholder')}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput /><CommandList><CommandEmpty>{t('noClientFound')}</CommandEmpty><CommandGroup>{contacts.map(c => (<CommandItem key={c.id} value={c.nom} onSelect={() => {setInvoice(p => ({...p, contact_id: c.id})); setComboboxOpen(false);}}><Check className={cn("mr-2 h-4 w-4", invoice.contact_id === c.id ? "opacity-100" : "opacity-0")} />{c.nom}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('issueDateLabel')}</Label>
                            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{invoice.issue_date ? format(new Date(invoice.issue_date),  "PPP", { locale: dateLocale }) : <span>{t('pickDate')}</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.issue_date ? new Date(invoice.issue_date) : undefined} onSelect={(d) => setInvoice(p => ({...p, issue_date: d?.toISOString()}))} /></PopoverContent></Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('dueDateLabel')}</Label>
                            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{invoice.due_date ? format(new Date(invoice.due_date),  "PPP", { locale: dateLocale }) : <span>{t('pickDate')}</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.due_date ? new Date(invoice.due_date) : undefined} onSelect={(d) => setInvoice(p => ({...p, due_date: d?.toISOString()}))} /></PopoverContent></Popover>
                        </div>
                    </div>

            
                      {/* Llista de conceptes */}
                      <div>
                        <Label className="font-semibold text-lg">{t('itemsTitle')}</Label>
                        <div className="mt-2 space-y-2">
                            {(invoice.invoice_items || []).map((item, index) => (
                                // ✅ CORRECCIÓN: Usamos 'bg-muted' que se adapta al tema.
                                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                    <Input placeholder={t('itemDescriptionPlaceholder')} value={item.description || ''} onChange={e => handleItemChange(index, 'description', e.target.value)} className="flex-grow" />
                                    <Input type="number" placeholder={t('itemQtyPlaceholder')} value={item.quantity || 1} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-20 text-center" />
                                    <Input type="number" placeholder={t('itemPricePlaceholder')} value={item.unit_price || 0} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} className="w-24 text-right" />
                                    <span className="w-24 text-right font-mono text-sm text-foreground">€{(Number(item.quantity || 1) * Number(item.unit_price || 0)).toFixed(2)}</span>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-3"><Plus className="w-4 h-4 mr-2" />{t('addItemButton')}</Button>
                    </div>

                    {/* Totals i notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-2">
                           <Label>{t('notesLabel')}</Label>
                           <Textarea placeholder={t('notesPlaceholder')} value={invoice.notes || ''} onChange={e => setInvoice(p => ({...p, notes: e.target.value}))} rows={5}/>
                        </div>
                        {/* ✅ CORRECCIÓ: Usamos 'bg-muted' para la caja de totales. */}
                        <div className="space-y-2 bg-muted p-4 rounded-lg">
                            <div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{t('subtotal')}</p><p className='font-mono text-foreground'>€{invoice.subtotal?.toFixed(2) || '0.00'}</p></div>
                            <div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{t('vat')}</p><p className='font-mono text-foreground'>€{invoice.tax_amount?.toFixed(2) || '0.00'}</p></div>
                            <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2"><p>{t('total')}</p><p className='font-mono'>€{invoice.total_amount?.toFixed(2) || '0.00'}</p></div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('cancelButton')}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {invoice.id ? t('saveChanges') : t('createDraft')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}