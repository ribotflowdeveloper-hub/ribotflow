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
import { ca, es, enUS } from "date-fns/locale"; import { cn } from "@/lib/utils/utils";
import { type Invoice, type Contact, type InvoiceItem } from '../types';
import { createOrUpdateInvoiceAction, type InvoiceFormData } from '../actions';
import { useTranslations, useLocale } from 'next-intl';
import type { Product } from '@/types/crm/products';
/**
 * Definim les propietats (props) que el nostre component de diàleg necessita per funcionar.
 */
interface InvoiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: Contact[];
    products: Product[];
    initialInvoice: Partial<Invoice>;
    onSaveSuccess: () => void;
}

export function InvoiceDialog({ isOpen, onClose, contacts, products, initialInvoice, onSaveSuccess }: InvoiceDialogProps) {
    const t = useTranslations('InvoicingPage.formDialog');
    const toast_ = useTranslations('InvoicingPage.toast');

    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;

    const [invoice, setInvoice] = useState(initialInvoice);
    const [isSaving, startSaveTransition] = useTransition();
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [openProductSearch, setOpenProductSearch] = useState<number | null>(null);

    useEffect(() => {
        const items = invoice.invoice_items || [];
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0);
        
        const taxAmount = items.reduce((acc, item) => {
            const lineTotal = (Number(item.quantity || 1) * Number(item.unit_price || 0));
            const taxRate = typeof item.tax_rate === 'number' ? item.tax_rate : 0.21; 
            return acc + (lineTotal * taxRate);
        }, 0);

        const totalAmount = subtotal + taxAmount;
        setInvoice(prev => ({ ...prev, subtotal, tax_amount: taxAmount, total_amount: totalAmount }));
    }, [invoice.invoice_items]);

    const handleProductSelect = (index: number, product: Product) => {
        const updatedItems = [...(invoice.invoice_items || [])];
        updatedItems[index] = {
            ...updatedItems[index],
            description: product.name,
            unit_price: product.price,
            tax_rate: product.iva,
            product_id: product.id,
        };
        setInvoice(prev => ({ ...prev, invoice_items: updatedItems }));
        setOpenProductSearch(null);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const updatedItems = [...(invoice.invoice_items || [])];
        const currentItem = { ...updatedItems[index] };
        
        if (field === 'description') {
            currentItem.product_id = undefined;
        }

        updatedItems[index] = { ...currentItem, [field]: value };
        setInvoice(prev => ({ ...prev, invoice_items: updatedItems }));
    };

    const addItem = () => {
        const newItem: InvoiceItem = { description: '', quantity: 1, unit_price: 0, tax_rate: 0.21 };
        setInvoice(prev => ({ ...prev, invoice_items: [...(prev.invoice_items || []), newItem] }));
    };

    const removeItem = (index: number) => {
        setInvoice(prev => ({ ...prev, invoice_items: (prev.invoice_items || []).filter((_, i) => i !== index) }));
    };

    const handleSave = () => {
        if (!invoice.contact_id || !invoice.issue_date) {
            toast.error(toast_('missingData'), { description: toast_('missingDataDesc') });
            return;
        }
        
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
            invoice_items: (invoice.invoice_items || []).map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                product_id: item.product_id ? String(item.product_id) : null,
            })),
        };
        
        startSaveTransition(async () => {
            const result = await createOrUpdateInvoiceAction(invoiceDataToSend);
            if (result.success) {
                toast.success(toast_('success'), { description: result.message });
                onSaveSuccess();
            } else {
                toast.error(toast_('error'), { description: result.message });
            }
        });
    };
    
    const selectedContact = contacts.find(c => c.id === invoice.contact_id);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-2xl">{invoice.id ? t('editTitle') : t('createTitle')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Dades del client i dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>{t('clientLabel')}</Label>
                            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between text-left font-normal">{selectedContact ? selectedContact.nom : t('selectClientPlaceholder')}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput /><CommandList><CommandEmpty>{t('noClientFound')}</CommandEmpty><CommandGroup>{contacts.map(c => (<CommandItem key={c.id} value={c.nom} onSelect={() => { setInvoice(p => ({ ...p, contact_id: c.id })); setComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", invoice.contact_id === c.id ? "opacity-100" : "opacity-0")} />{c.nom}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('issueDateLabel')}</Label>
                            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{invoice.issue_date ? format(new Date(invoice.issue_date), "PPP", { locale: dateLocale }) : <span>{t('pickDate')}</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.issue_date ? new Date(invoice.issue_date) : undefined} onSelect={(d) => setInvoice(p => ({ ...p, issue_date: d?.toISOString() }))} /></PopoverContent></Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('dueDateLabel')}</Label>
                            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{invoice.due_date ? format(new Date(invoice.due_date), "PPP", { locale: dateLocale }) : <span>{t('pickDate')}</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.due_date ? new Date(invoice.due_date) : undefined} onSelect={(d) => setInvoice(p => ({ ...p, due_date: d?.toISOString() }))} /></PopoverContent></Popover>
                        </div>
                    </div>

                    {/* Llista de conceptes */}
                    <div>
                        <Label className="font-semibold text-lg">{t('itemsTitle')}</Label>
                        
                        {/* Capçaleres de la taula de conceptes (només visibles en pantalles grans) */}
                        <div className="hidden md:grid grid-cols-[1fr,100px,120px,100px,120px,auto] gap-3 mt-2 text-xs text-muted-foreground px-3">
                            <Label>{t('itemDescriptionLabel')}</Label>
                            <Label className="text-center">{t('itemQtyLabel')}</Label>
                            <Label className="text-right">{t('itemPriceLabel')}</Label>
                            <Label className="text-center">{t('itemTaxLabel')}</Label>
                            <Label className="text-right">{t('itemTotalLabel')}</Label>
                        </div>

                        <div className="mt-2 space-y-2">
                            {(invoice.invoice_items || []).map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr,100px,120px,100px,120px,auto] items-start gap-3 p-2 bg-muted rounded-lg">
                                    
                                    {/* Concepte */}
                                    <Popover open={openProductSearch === index} onOpenChange={(isOpen) => setOpenProductSearch(isOpen ? index : null)}>
                                        <PopoverTrigger asChild>
                                            <div className="relative w-full">
                                                <Input
                                                    placeholder={t('itemDescriptionPlaceholder')}
                                                    value={item.description || ''}
                                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                    className="pr-8"
                                                />
                                                <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 cursor-pointer" />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder={t('searchProductPlaceholder')} />
                                                <CommandList>
                                                    <CommandEmpty>{t('noProductFound')}</CommandEmpty>
                                                    <CommandGroup>
                                                        {products.map(product => (
                                                            <CommandItem key={product.id} value={product.name} onSelect={() => handleProductSelect(index, product)}>
                                                                <Check className={cn("mr-2 h-4 w-4", item.product_id === product.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex-1">{product.name}</div>
                                                                <div className="text-xs text-muted-foreground">€{product.price.toFixed(2)}</div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Quantitat */}
                                    <Input type="number" value={item.quantity || 1} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="text-center" />
                                    {/* Preu */}
                                    <Input type="number" value={item.unit_price || 0} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} className="text-right" />
                                    {/* IVA (%) */}
                                    <div className="relative">
                                        <Input type="number" value={Math.round((item.tax_rate ?? 0.21) * 100)} onChange={e => handleItemChange(index, 'tax_rate', Number(e.target.value) / 100)} className="text-center pr-6" />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                    </div>
                                    {/* Total Línia */}
                                    <span className="h-10 flex items-center justify-end font-mono text-sm pr-3">
                                        €{(Number(item.quantity || 1) * Number(item.unit_price || 0)).toFixed(2)}
                                    </span>
                                    {/* Eliminar */}
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4"><Plus className="w-4 h-4 mr-2" />{t('addItemButton')}</Button>
                    </div>

                    {/* Totals i notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-2">
                           <Label>{t('notesLabel')}</Label>
                           <Textarea placeholder={t('notesPlaceholder')} value={invoice.notes || ''} onChange={e => setInvoice(p => ({ ...p, notes: e.target.value }))} rows={5} />
                        </div>
                        <div className="space-y-2 bg-muted p-4 rounded-lg self-start">
                            <div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{t('subtotal')}</p><p className='font-mono text-foreground'>€{invoice.subtotal?.toFixed(2) || '0.00'}</p></div>
                            <div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{t('vat')}</p><p className='font-mono text-foreground'>€{invoice.tax_amount?.toFixed(2) || '0.00'}</p></div>
                            <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2"><p>{t('total')}</p><p className='font-mono'>€{invoice.total_amount?.toFixed(2) || '0.00'}</p></div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t p-6 bg-secondary/50">
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