import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Edit, Download } from 'lucide-react';
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { useToast } from '@/components/ui/use-toast'; // NOU: Importem el toast per a missatges d'error

export const ExpenseDetailDrawer = ({ expense, isOpen, onClose, onEdit }) => {
    const [attachmentUrls, setAttachmentUrls] = useState([]);
    const { toast } = useToast(); // NOU: Inicialitzem el toast

    useEffect(() => {
        if (expense && expense.expense_attachments) {
            const urls = expense.expense_attachments.map(att => {
                const { data } = supabase.storage.from('despeses-adjunts').getPublicUrl(att.file_path);
                return { ...att, publicUrl: data.publicUrl };
            });
            setAttachmentUrls(urls);
        }
    }, [expense]);

    // NOU: Funció per gestionar la descàrrega de l'arxiu
    const handleDownload = async (attachment) => {
        try {
            const response = await fetch(attachment.publicUrl);
            if (!response.ok) throw new Error('La resposta de la xarxa no ha estat correcta.');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = attachment.filename;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error de descàrrega',
                description: 'No s\'ha pogut descarregar l\'arxiu.',
            });
            console.error('Error en la descàrrega:', error);
        }
    };

    if (!expense) return null;

    const baseImposable = (expense.subtotal || 0) - (expense.discount_amount || 0);

    return (
        <Drawer open={isOpen} onClose={onClose}>
            <DrawerContent className="glass-effect text-white p-6">
                <div className="max-w-4xl mx-auto w-full">
                    <DrawerHeader className="text-left p-0 mb-4">
                        <DrawerTitle className="text-2xl font-bold">{expense.suppliers?.nom || expense.description}</DrawerTitle>
                        <DrawerDescription>{expense.invoice_number ? `Factura Nº ${expense.invoice_number}` : 'Despesa sense número'}</DrawerDescription>
                    </DrawerHeader>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-4">
                            <h3 className="font-semibold flex items-center gap-2"><Paperclip className="w-4 h-4" /> Adjunts</h3>
                            {attachmentUrls.length > 0 ? (
                                <div className="space-y-2">
                                    {attachmentUrls.map(att => (
                                        <div key={att.id} className="bg-white/5 p-2 rounded-lg flex items-center justify-between">
                                            <a href={att.publicUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm hover:underline">
                                                {att.filename}
                                            </a>
                                            {/* CORREGIT: El botó ara crida a la funció handleDownload */}
                                            <Button variant="ghost" size="icon" onClick={() => handleDownload(att)}>
                                                <Download className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        {attachmentUrls.filter(att => att.mime_type.startsWith('image/')).map(att => (
                                            <a key={`thumb-${att.id}`} href={att.publicUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={att.publicUrl} alt={att.filename} className="rounded-md object-cover w-full h-24 hover:opacity-80 transition-opacity" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No hi ha arxius adjunts.</p>
                            )}
                        </div>

                        <div className="md:col-span-2 bg-white/5 p-6 rounded-xl space-y-4">
                             <div className="flex justify-between items-center"><span className="text-muted-foreground">Data</span><span>{expense.expense_date ? format(new Date(expense.expense_date), "PPP", { locale: ca }) : '-'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Categoria</span><Badge variant="secondary">{expense.category || 'Sense categoria'}</Badge></div>
                            <div className="border-t border-white/10 my-4"></div>
                             <div className='space-y-2 text-sm'>
                                <div className='flex justify-between items-center'><p className="text-muted-foreground">Subtotal</p><p className='font-mono'>€{(expense.subtotal || 0).toFixed(2)}</p></div>
                                {expense.discount_amount > 0 && (<div className='flex justify-between items-center text-orange-400'><p>Descompte</p><p className='font-mono'>-€{(expense.discount_amount || 0).toFixed(2)}</p></div>)}
                                <div className='flex justify-between items-center'><p className="text-muted-foreground">Base Imposable</p><p className='font-mono'>€{baseImposable.toFixed(2)}</p></div>
                                <div className='flex justify-between items-center'><p className="text-muted-foreground">IVA ({expense.tax_rate || 21}%)</p><p className='font-mono'>€{(expense.tax_amount || 0).toFixed(2)}</p></div>
                             </div>
                             <div className='flex justify-between items-center text-xl font-bold border-t border-white/20 pt-2 mt-2'><p>Total</p><p className='font-mono'>- €{(expense.total_amount || 0).toFixed(2)}</p></div>
                        </div>
                    </div>

                    <DrawerFooter className="flex-row p-0 pt-6">
                        <Button onClick={() => onEdit(expense)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                        <Button variant="outline" onClick={onClose}>Tancar</Button>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};