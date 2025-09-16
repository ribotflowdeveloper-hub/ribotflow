"use client";

import React, { useState, useEffect, useTransition, FC } from 'react';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Calendar as CalendarIcon, Check, ChevronsUpDown, Trash2, UploadCloud, Paperclip, BrainCircuit } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { type Expense, type Supplier, type ExpenseItem } from '@/types/finances';
import { saveExpenseAction, processOcrAction, uploadAttachmentAction } from '@/app/[locale]/(app)/finances/despeses/_components/actions';
// Definim les propietats que el component espera rebre.
interface ExpenseDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    initialData: Expense | null; // Pot rebre una despesa per editar, o null per crear-ne una de nova.
    suppliers: Supplier[]; // Llista de proveïdors per al selector.
  }

// Define a more flexible type for the form state
type ExpenseFormState = Omit<Expense, 'id' | 'created_at' | 'user_id' | 'suppliers'> & { id?: string | null };

// Funció que retorna un objecte de despesa buit, per a inicialitzar el formulari de creació.
const getInitialExpenseState = (): ExpenseFormState => ({
    supplier_id: null, invoice_number: '', expense_date: new Date().toISOString(),
    category: '', description: '', notes: '', discount_amount: 0, tax_rate: 21,
    expense_items: [{ description: '', quantity: 1, unit_price: 0 }],
    expense_attachments: [], subtotal: 0, tax_amount: 0, total_amount: 0,
});
/**
 * Component de diàleg per crear i editar despeses.
 * És un component complex que gestiona:
 * - Un formulari amb múltiples camps i selectors.
 * - Lògica per afegir/eliminar línies de concepte dinàmicament.
 * - Càlcul automàtic de totals.
 * - Pujada d'arxius (OCR i adjunts manuals).
 */
export const ExpenseDialog: FC<ExpenseDialogProps> = ({ isOpen, setIsOpen, initialData, suppliers }) => {
     // Hooks de transició per gestionar els estats de càrrega de les diferents accions.
    const [isSaving, startSaveTransition] = useTransition();
    const [isProcessingOcr, startOcrTransition] = useTransition();
    const [isUploading, startUploadTransition] = useTransition();
    // Estat principal que emmagatzema totes les dades del formulari.
    const [currentExpense, setCurrentExpense] = useState<ExpenseFormState>(getInitialExpenseState());
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    /**
     * 'useEffect' per inicialitzar o resetejar l'estat del diàleg cada cop que s'obre.
     * Si rep 'initialData', carrega les dades per a edició. Si no, prepara un formulari buit.
     */
    useEffect(() => {
        if (isOpen) {
            const expense = initialData ? { ...initialData } : getInitialExpenseState();
            setCurrentExpense(expense);
            if (initialData?.supplier_id) {
                setSelectedSupplier(suppliers.find(s => s.id === initialData.supplier_id) || null);
            } else {
                setSelectedSupplier(null);
            }
        }
    }, [initialData, isOpen, suppliers]);
/**
     * 'useEffect' per recalcular automàticament els totals (subtotal, impostos, total)
     * cada cop que canvien els conceptes, el percentatge d'IVA o el descompte.
     */
    useEffect(() => {
        const items = currentExpense.expense_items || [];
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
        const discount = Number(currentExpense.discount_amount) || 0;
        const taxRate = currentExpense.tax_rate || 21;
        const baseImposable = subtotal - discount;
        const taxAmount = baseImposable * (taxRate / 100);
        const totalAmount = baseImposable + taxAmount;
        setCurrentExpense(prev => ({ ...prev, subtotal, tax_amount: taxAmount, total_amount: totalAmount }));
    }, [currentExpense.expense_items, currentExpense.tax_rate, currentExpense.discount_amount]);
// Funcions per a la gestió dinàmica de les línies de concepte.
    const handleItemChange = (index: number, field: keyof ExpenseItem, value: string | number) => {
        const updatedItems = [...currentExpense.expense_items];
        // @ts-expect-error: La propietat 'form' existeix a l'event, però el tipus no la inclou.
        updatedItems[index][field] = value;
        setCurrentExpense(prev => ({ ...prev, expense_items: updatedItems }));
    };
    const addItem = () => setCurrentExpense(prev => ({ ...prev, expense_items: [...prev.expense_items, { description: '', quantity: 1, unit_price: 0 }] }));
    const removeItem = (index: number) => setCurrentExpense(prev => ({ ...prev, expense_items: prev.expense_items.filter((_, i) => i !== index) }));
/**
     * Gestiona la pujada d'un arxiu (factura/tiquet) per a processament OCR amb IA.
     * Crida la Server Action 'processOcrAction' i actualitza el formulari amb les dades extretes.
     */
    const handleOcrUpload = (file: File | undefined) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        
        startOcrTransition(async () => {
            const { data, error } = await processOcrAction(formData);
        
            if (error) {
                toast.error("Error processant la factura", { description: error.message });
            } else if (data) {
                // Garantim tipus correcte
                const newItems: ExpenseItem[] = Array.isArray(data.expense_items)
                    ? data.expense_items.map(item => ({
                        description: String(item.description || ''),
                        quantity: Number(item.quantity || 1),
                        unit_price: Number(item.unit_price || 0),
                    }))
                    : [{ description: '', quantity: 1, unit_price: 0 }];
        
                setCurrentExpense(prev => ({
                    ...prev,
                    ...data,
                    expense_items: newItems,
                    expense_date: data.issue_date && typeof data.issue_date === 'string'
                        ? new Date(data.issue_date).toISOString()
                        : prev.expense_date,
                }));
        
                toast.success('Dades extretes!', { description: 'Revisa i completa el formulari.' });
            } else {
                toast.error("No s'han pogut extreure dades");
            }
        });
        
        

    };
/**
     * Gestiona la pujada manual d'un arxiu adjunt a una despesa ja existent.
     */
    const handleAttachmentUpload = (file: File | undefined) => {
        if (!file || !initialData?.id) return;
        const formData = new FormData();
        formData.append('file', file);

        startUploadTransition(async () => {
            const { error } = await uploadAttachmentAction(initialData.id, formData);
            if (error) {
                toast.error("Error en pujar l'adjunt", { description: error.message });
            } else {
                toast.success("Èxit", { description: "S'ha pujat l'adjunt correctament." });
                window.location.reload();
            }
        });
    };
/**
     * Gestiona el desat final de la despesa (creació o actualització).
     * Crida la Server Action 'saveExpenseAction'.
     */
    const handleSave = () => {
        startSaveTransition(async () => {
            const { error } = await saveExpenseAction(currentExpense, initialData?.id || null);
            if (error) {
                toast.error('Error en desar', { description: error.message });
            } else {
                toast.success('Èxit!', { description: 'Despesa desada correctament.' });
                setIsOpen(false);
                window.location.reload();
            }
        });
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="glass-effect max-w-4xl h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{initialData ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                    <DialogDescription>Registra una despesa manualment o puja un arxiu.</DialogDescription>
                </DialogHeader>
                <div className='flex-1 overflow-y-auto pr-4 -mr-6'>
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="grid gap-6 pt-4">
                       <div className='bg-white/5 p-4 rounded-lg'><Label htmlFor="ocr-file-dialog" className='flex items-center gap-2 font-bold mb-2 cursor-pointer'><BrainCircuit className='w-5 h-5 text-purple-400'/> Omplir amb IA</Label><Input id="ocr-file-dialog" type="file" accept="image/*,application/pdf" className='text-xs' onChange={(e) => handleOcrUpload(e.target.files?.[0])} disabled={isProcessingOcr}/>{isProcessingOcr && <p className='text-xs mt-2 flex items-center gap-2'><Loader2 className='w-4 h-4 animate-spin'/>Processant...</p>}</div>
                       
                       <div className="space-y-2"><Label>Descripció General</Label><Input placeholder="Ex: Compra de material d'oficina" value={currentExpense.description || ''} onChange={e => setCurrentExpense(p => ({...p, description: e.target.value}))} required /></div>
                       
                       <div className='grid md:grid-cols-2 gap-4'>
                            <div className="space-y-2"><Label>Proveïdor</Label><Popover open={comboboxOpen} onOpenChange={setComboboxOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between text-left font-normal">{selectedSupplier?.nom || "Selecciona un proveïdor..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect"><Command><CommandInput placeholder="Buscar proveïdor..." /><CommandList><CommandEmpty>No s'ha trobat.</CommandEmpty><CommandGroup>{suppliers.map((s) => (<CommandItem key={s.id} value={s.nom} onSelect={() => {setSelectedSupplier(s); setCurrentExpense(p => ({...p, supplier_id: s.id})); setComboboxOpen(false);}}><Check className={cn("mr-2 h-4 w-4", currentExpense.supplier_id === s.id ? "opacity-100" : "opacity-0")} />{s.nom}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                            <div className="space-y-2"><Label>Nº Factura / Tiquet</Label><Input value={currentExpense.invoice_number || ''} onChange={e => setCurrentExpense(p => ({...p, invoice_number: e.target.value}))} /></div>
                            <div className="space-y-2"><Label>Data de la Despesa</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !currentExpense.expense_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{currentExpense.expense_date ? format(new Date(currentExpense.expense_date), "PPP", { locale: ca }) : <span>Tria data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentExpense.expense_date ? new Date(currentExpense.expense_date) : undefined} onSelect={(d: Date | undefined) =>setCurrentExpense(p => ({ ...p, expense_date: d?.toISOString() || "" }))} initialFocus className={undefined} classNames={undefined} formatters={undefined} components={undefined} /></PopoverContent></Popover></div>
                            <div className="space-y-2"><Label>Categoria</Label><Input placeholder="Ex: Software, Material..." value={currentExpense.category || ''} onChange={e => setCurrentExpense(p => ({...p, category: e.target.value}))} /></div>
                       </div>
                       
                       <div className='space-y-2'><Label className='font-bold'>Conceptes</Label><Table><TableHeader><TableRow className="border-b-white/10"><TableHead className='w-2/4'>Descripció</TableHead><TableHead>Quant.</TableHead><TableHead>P. Unitari</TableHead><TableHead>Total</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{(currentExpense.expense_items || []).map((item, index) => (<TableRow key={index} className="border-b-white/10"><TableCell><Input value={item.description || ''} onChange={e => handleItemChange(index, 'description', e.target.value)} /></TableCell><TableCell><Input type="number" value={item.quantity || 1} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-20" /></TableCell><TableCell><Input type="number" step="0.01" value={item.unit_price || 0} onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24" /></TableCell><TableCell className='font-mono'>€{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</TableCell><TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody></Table><Button type="button" variant="outline" size="sm" onClick={addItem} className='mt-2'><Plus className='w-4 h-4 mr-2'/>Afegir línia</Button></div>
                       
                       <div className='grid md:grid-cols-2 gap-8'>
                            <div className='space-y-2'><Label>Notes</Label><Textarea value={currentExpense.notes || ''} onChange={e => setCurrentExpense(p => ({...p, notes: e.target.value}))} rows={5}/></div>
                            <div className='space-y-4 bg-white/5 p-4 rounded-lg'><div className='flex justify-between items-center text-sm'><p className="text-muted-foreground">Subtotal</p><p className='font-mono'>€{(currentExpense.subtotal || 0).toFixed(2)}</p></div><div className='flex justify-between items-center text-sm text-orange-400'><Label htmlFor="discount-input-expense" className="text-orange-400">Descompte</Label><div className="flex items-center gap-2"><span className="font-mono">-€</span><Input id="discount-input-expense" type="number" step="0.01" value={currentExpense.discount_amount || ''} onChange={e => setCurrentExpense(p => ({...p, discount_amount: parseFloat(e.target.value) || 0}))} className="w-24 h-8 font-mono text-right" placeholder="0.00"/></div></div><div className='flex justify-between items-center text-sm pt-2 border-t border-white/10'><p className="font-semibold">Base Imposable</p><p className='font-mono font-semibold'>€{((currentExpense.subtotal || 0) - (currentExpense.discount_amount || 0)).toFixed(2)}</p></div><div className='flex justify-between items-center text-sm'><div className='flex items-center gap-2'><p className="text-muted-foreground">IVA</p><Input type="number" value={currentExpense.tax_rate || 21} onChange={e => setCurrentExpense(p => ({...p, tax_rate: parseFloat(e.target.value) || 0}))} className='w-16 h-8'/><span>%</span></div><p className='font-mono'>€{(currentExpense.tax_amount || 0).toFixed(2)}</p></div><div className='flex justify-between items-center text-lg font-bold border-t border-white/20 pt-2 mt-2'><p>Total</p><p className='font-mono'>€{(currentExpense.total_amount || 0).toFixed(2)}</p></div></div>
                       </div>
                       
                       {initialData?.id && <div className='space-y-2'>
                            <Label htmlFor="attachment-file-expense" className='flex items-center gap-2 font-bold'><UploadCloud className='w-5 h-5 text-purple-400'/>Pujar Arxius</Label>
                            <Input id="attachment-file-expense" type="file" className='text-xs' onChange={(e) => handleAttachmentUpload(e.target.files?.[0])} disabled={isUploading}/>
                            {isUploading && <p className='text-xs mt-2 flex items-center gap-2'><Loader2 className='w-4 h-4 animate-spin'/>Pujant...</p>}
                            {(currentExpense.expense_attachments || []).length > 0 && <div className='space-y-1 pt-2'>{currentExpense.expense_attachments.map(att => <div key={att.id} className='flex items-center justify-between text-sm bg-white/5 p-2 rounded'>
                                <div className='flex items-center gap-2'><Paperclip className='w-4 h-4'/>{att.filename}</div>
                            </div>)}</div>}
                       </div>}
                    </form>
                </div>
                <DialogFooter className="pt-4 border-t border-white/10">
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel·lar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className='w-4 h-4 animate-spin mr-2'/>}
                        {initialData ? 'Desar Canvis' : 'Crear Despesa'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};