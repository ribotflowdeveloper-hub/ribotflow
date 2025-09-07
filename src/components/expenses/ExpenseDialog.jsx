import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Calendar as CalendarIcon, Check, ChevronsUpDown, Trash2, UploadCloud, Paperclip, Download, BrainCircuit } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ca } from "date-fns/locale";

const getInitialExpenseState = () => ({
    id: null, supplier_id: null, invoice_number: '', expense_date: new Date(),
    category: '', description: '', notes: '', discount_amount: 0, tax_rate: 21,
    expense_items: [{ description: '', quantity: 1, unit_price: 0 }],
    attachments: [], subtotal: 0, tax_amount: 0, total_amount: 0, extra_data: {},
});

export const ExpenseDialog = ({ isOpen, setIsOpen, initialData, suppliers, onSave, processOcrFile, uploadAttachment, downloadAttachment }) => {
    const { toast } = useToast();
    const [currentExpense, setCurrentExpense] = useState(getInitialExpenseState());
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrFile, setOcrFile] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // S'està editant una despesa existent
                setCurrentExpense({ ...getInitialExpenseState(), ...initialData });
            } else {
                // S'està creant una de nova
                setCurrentExpense(getInitialExpenseState());
            }
        }
    }, [initialData, isOpen]);

    useEffect(() => {
        const items = currentExpense.expense_items || [];
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
        const discount = Number(currentExpense.discount_amount) || 0;
        const taxRate = currentExpense.tax_rate || 21;
        const baseImposable = subtotal - discount;
        const taxAmount = baseImposable * (taxRate / 100);
        const totalAmount = baseImposable + taxAmount;
        setCurrentExpense(prev => ({ ...prev, subtotal, tax_amount: taxAmount, total_amount: totalAmount }));
    }, [currentExpense.expense_items, currentExpense.tax_rate, currentExpense.discount_amount]);

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...currentExpense.expense_items];
        updatedItems[index][field] = value;
        setCurrentExpense(prev => ({ ...prev, expense_items: updatedItems }));
    };
    const addItem = () => setCurrentExpense(prev => ({ ...prev, expense_items: [...prev.expense_items, { description: '', quantity: 1, unit_price: 0 }] }));
    const removeItem = (index) => setCurrentExpense(prev => ({ ...prev, expense_items: prev.expense_items.filter((_, i) => i !== index) }));

    const handleOcrUpload = async (file) => {
        if (!file) return;
        setOcrFile(file);
        setIsProcessingOcr(true);
        const { data, error } = await processOcrFile(file);
        setIsProcessingOcr(false);
        if (error) {
            toast({ variant: 'destructive', title: "Error processant la factura", description: error.message });
        } else {
            const newItems = data.expense_items && data.expense_items.length > 0 ? data.expense_items : [{ description: '', quantity: 1, unit_price: 0 }];
            setCurrentExpense(prev => ({...prev, ...data, expense_items: newItems, expense_date: data.issue_date ? new Date(data.issue_date) : prev.expense_date,}));
            toast({ title: 'Dades extretes amb èxit!', description: 'Revisa i completa el formulari.' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentExpense.description || currentExpense.description.trim() === '') {
            toast({ variant: 'destructive', title: 'Camp obligatori', description: 'La descripció és necessària.' });
            return;
        }
        setIsSaving(true);
        const { success, error } = await onSave(currentExpense, ocrFile); 
        setIsSaving(false);

        if (success) {
            toast({ title: 'Èxit!', description: 'Despesa guardada correctament.' });
            setOcrFile(null);
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error en desar', description: error.message });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="glass-effect text-white max-w-4xl h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{currentExpense.id ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                    <DialogDescription className="text-gray-400">Registra una despesa manualment o puja un tiquet per omplir-la amb IA.</DialogDescription>
                </DialogHeader>
                <div className='flex-1 overflow-y-auto pr-2 -mr-6'>
                    <form id="expense-form-dialog" onSubmit={handleSave} className="grid gap-6 pt-4">
                         <div className='bg-white/5 p-4 rounded-lg'><Label htmlFor="ocr-file-dialog" className='flex items-center gap-2 font-bold mb-2 cursor-pointer'><BrainCircuit className='w-5 h-5 text-purple-400'/> Omplir amb IA</Label><Input id="ocr-file-dialog" type="file" accept="image/*,application/pdf" className='search-input text-xs' onChange={(e) => handleOcrUpload(e.target.files[0])} disabled={isProcessingOcr}/>{isProcessingOcr && <p className='text-xs mt-2 flex items-center gap-2'><Loader2 className='w-4 h-4 animate-spin'/>Processant...</p>}</div>
                         <div className="space-y-2"><Label>Descripció General</Label><Input placeholder="Ex: Compra de material d'oficina a Amazon" value={currentExpense.description || ''} onChange={e => setCurrentExpense(p => ({...p, description: e.target.value}))} className="search-input" required /></div>
                         <div className='grid md:grid-cols-2 gap-4'>
                            <div className="space-y-2"><Label>Proveïdor</Label><Popover><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal">{suppliers.find(s => s.id === currentExpense.supplier_id)?.nom || "Selecciona un proveïdor..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect"><Command><CommandInput placeholder="Buscar proveïdor..." /><CommandList><CommandEmpty>No s'ha trobat.</CommandEmpty><CommandGroup>{suppliers.map((s) => (<CommandItem key={s.id} value={s.nom} onSelect={() => setCurrentExpense(p => ({...p, supplier_id: s.id}))}><Check className={cn("mr-2 h-4 w-4", currentExpense.supplier_id === s.id ? "opacity-100" : "opacity-0")} />{s.nom}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
                            <div className="space-y-2"><Label>Nº Factura / Tiquet</Label><Input value={currentExpense.invoice_number || ''} onChange={e => setCurrentExpense(p => ({...p, invoice_number: e.target.value}))} className="search-input" /></div>
                            <div className="space-y-2"><Label>Data de la Despesa</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal search-input", !currentExpense.expense_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{currentExpense.expense_date ? format(new Date(currentExpense.expense_date), "PPP", { locale: ca }) : <span>Tria data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentExpense.expense_date ? new Date(currentExpense.expense_date) : null} onSelect={(d) => setCurrentExpense(p => ({...p, expense_date: d}))} initialFocus /></PopoverContent></Popover></div>
                            <div className="space-y-2"><Label>Categoria</Label><Input placeholder="Ex: Software, Material..." value={currentExpense.category || ''} onChange={e => setCurrentExpense(p => ({...p, category: e.target.value}))} className="search-input" /></div>
                         </div>
                         <div className='space-y-2'><Label className='font-bold'>Conceptes</Label><Table><TableHeader><TableRow className="border-b-white/10"><TableHead className='w-2/4'>Descripció</TableHead><TableHead>Quant.</TableHead><TableHead>P. Unitari</TableHead><TableHead>Total</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{(currentExpense.expense_items || []).map((item, index) => (<TableRow key={index} className="border-b-white/10"><TableCell><Input value={item.description || ''} onChange={e => handleItemChange(index, 'description', e.target.value)} className="search-input" /></TableCell><TableCell><Input type="number" value={item.quantity || 1} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="search-input w-20" /></TableCell><TableCell><Input type="number" step="0.01" value={item.unit_price || 0} onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="search-input w-24" /></TableCell><TableCell className='font-mono'>€{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</TableCell><TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody></Table><Button type="button" variant="outline" size="sm" onClick={addItem} className='mt-2'><Plus className='w-4 h-4 mr-2'/>Afegir línia</Button></div>
                         <div className='grid md:grid-cols-2 gap-8'>
                            <div className='space-y-2'><Label>Notes</Label><Textarea value={currentExpense.notes || ''} onChange={e => setCurrentExpense(p => ({...p, notes: e.target.value}))} className='search-input' rows={5}/></div>
                            <div className='space-y-4 bg-white/5 p-4 rounded-lg'><div className='flex justify-between items-center text-sm'><p className="text-muted-foreground">Subtotal</p><p className='font-mono'>€{(currentExpense.subtotal || 0).toFixed(2)}</p></div><div className='flex justify-between items-center text-sm text-orange-400'><Label htmlFor="discount-input-expense" className="text-orange-400">Descompte</Label><div className="flex items-center gap-2"><span className="font-mono">-€</span><Input id="discount-input-expense" type="number" step="0.01" value={currentExpense.discount_amount || ''} onChange={e => setCurrentExpense(p => ({...p, discount_amount: parseFloat(e.target.value) || 0}))} className="search-input w-24 h-8 font-mono text-right bg-orange-400/10 border-orange-400/50 text-orange-400" placeholder="0.00"/></div></div><div className='flex justify-between items-center text-sm pt-2 border-t border-white/10'><p className="font-semibold">Base Imposable</p><p className='font-mono font-semibold'>€{((currentExpense.subtotal || 0) - (currentExpense.discount_amount || 0)).toFixed(2)}</p></div><div className='flex justify-between items-center text-sm'><div className='flex items-center gap-2'><p className="text-muted-foreground">IVA</p><Input type="number" value={currentExpense.tax_rate || 21} onChange={e => setCurrentExpense(p => ({...p, tax_rate: parseFloat(e.target.value) || 0}))} className='search-input w-16 h-8'/><span>%</span></div><p className='font-mono'>€{(currentExpense.tax_amount || 0).toFixed(2)}</p></div><div className='flex justify-between items-center text-lg font-bold border-t border-white/20 pt-2 mt-2'><p>Total</p><p className='font-mono'>€{(currentExpense.total_amount || 0).toFixed(2)}</p></div></div>
                         </div>
                         {currentExpense.id && <div className='space-y-2'>
                            <Label htmlFor="attachment-file-expense" className='flex items-center gap-2 font-bold'><UploadCloud className='w-5 h-5 text-purple-400'/>Pujar Arxius</Label>
                            <Input id="attachment-file-expense" type="file" className='search-input text-xs' onChange={(e) => uploadAttachment(e.target.files[0], currentExpense.id)} disabled={isUploading}/>
                            {isUploading && <p className='text-xs mt-2 flex items-center gap-2'><Loader2 className='w-4 h-4 animate-spin'/>Pujant...</p>}
                            {(currentExpense.attachments || []).length > 0 && <div className='space-y-1 pt-2'>{currentExpense.attachments.map(att => <div key={att.id} className='flex items-center justify-between text-sm bg-white/5 p-2 rounded'>
                                <div className='flex items-center gap-2'><Paperclip className='w-4 h-4'/>{att.filename}</div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => downloadAttachment(att)}>
                                    <Download className='w-4 h-4'/>
                                </Button>
                            </div>)}</div>}
                        </div>}
                    </form>
                </div>
                <DialogFooter className="pt-4 border-t border-white/10">
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel·lar</Button></DialogClose>
                    <Button type="submit" form="expense-form-dialog" className="bg-purple-600 hover:bg-purple-700" disabled={isSaving}>
                        {isSaving && <Loader2 className='w-4 h-4 animate-spin mr-2'/>}
                        {currentExpense.id ? 'Desar Canvis' : 'Crear Despesa'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};