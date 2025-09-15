"use client";

import React, { useState, useTransition } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, BookPlus, Save } from 'lucide-react';
// TextareaAutosize és una llibreria útil que fa que l'alçada del camp de text
// creixi i decreixi automàticament amb el contingut.
import TextareaAutosize from 'react-textarea-autosize';
// Aquesta Server Action es crida per crear un nou producte desable.
import { createProductAction } from '../actions';
import { useRouter } from 'next/navigation';
import type { QuoteItem, Product } from '../page';

/**
 * Component per gestionar la llista de conceptes (línies de producte/servei) d'un pressupost.
 * Permet a l'usuari afegir, editar i eliminar conceptes, ja sigui manualment
 * o seleccionant-los d'una llista de productes predefinits.
 */
export const QuoteItems = ({ items, setItems, products }: {
    items: QuoteItem[]; // L'array de conceptes actuals del pressupost.
    setItems: (newItems: QuoteItem[]) => void; // Funció per actualitzar l'estat del pressupost al component pare.
    products: Product[]; // Llista de productes predefinits disponibles per afegir.
}) => {
    const router = useRouter();
    const [isSavingProduct, startSaveProductTransition] = useTransition(); // Estat de càrrega per a desar un nou producte.
    const [isCreating, setIsCreating] = useState(false); // Controla la UI per mostrar el formulari de nou producte.
    const [newProduct, setNewProduct] = useState({ name: '', price: '' }); // Emmagatzema les dades del nou producte que s'està creant.
    const [isPopoverOpen, setIsPopoverOpen] = useState(false); // Controla la visibilitat del menú desplegable.

    /**
     * Gestiona els canvis en qualsevol camp d'un concepte de la llista (descripció, quantitat, preu).
     * És una funció genèrica que funciona per a qualsevol camp del tipus 'QuoteItem'.
     */
    const handleItemChange = <K extends keyof QuoteItem>(
        index: number,
        field: K,
        value: QuoteItem[K]
      ) => {
        const newItems = [...items]; // Creem una còpia de l'array per no mutar l'estat directament.
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems); // Cridem la funció del pare per actualitzar l'estat global del pressupost.
      };
      

    /**
     * Afegeix un nou concepte (una nova fila) a la llista del pressupost.
     * Pot ser un concepte buit (manual) o un basat en un producte existent.
     */
    const handleAddItem = (itemData: Partial<QuoteItem> = {}) => {
        const newItem: QuoteItem = {
            description: itemData.description || '',
            quantity: itemData.quantity || 1,
            unit_price: itemData.unit_price || 0,
            product_id: itemData.product_id || null,
        };
        setItems([...items, newItem]);
        setIsPopoverOpen(false); // Tanca el menú desplegable després d'afegir.
    };

    /**
     * Funció específica per afegir un concepte basat en un producte predefinit de la llista.
     */
    const handleAddProduct = (product: Product) => {
        const description = product.name || product.description || '';
        handleAddItem({ description, quantity: 1, unit_price: product.price, product_id: product.id });
    };

    // Elimina un concepte de la llista basant-se en el seu índex.
    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    
    /**
     * Desa un nou producte a la base de dades a través d'una Server Action
     * i l'afegeix immediatament al pressupost actual.
     */
    const handleSaveNewProduct = () => {
        if (!newProduct.name || !newProduct.price) {
            toast.error('Camps requerits', { description: 'El nom i el preu són obligatoris.' });
            return;
        }
        startSaveProductTransition(async () => {
            const result = await createProductAction({ name: newProduct.name, price: parseFloat(newProduct.price) });
            if(result.success && result.newProduct) {
                toast.success("Producte creat!", { description: "S'ha afegit a la teva llista de productes."});
                handleAddProduct(result.newProduct); // Afegeix el producte acabat de crear al pressupost.
                // Neteja els estats del formulari.
                setNewProduct({ name: '', price: '' });
                setIsCreating(false);
                router.refresh(); // Refresca les dades per si un altre component depèn de la llista de productes.
            } else {
                toast.error("Error", { description: result.message });
            }
        });
    }


    return (
        <div>
            <h3 className="font-semibold text-lg mb-4">Conceptes</h3>
            {/* ✅ DISSENY MILLORAT: Reduïm l'espaiat vertical de 1rem (y-4) a 0.5rem (y-2) */}
            <div className="space-y-2">
                {items.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                        Afegeix el primer concepte al pressupost.
                    </div>
                )}
                {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <TextareaAutosize
                            placeholder="Descripció del servei o producte"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            minRows={1}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[300px]"
                        />
                        <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)} className="w-20" placeholder="Quant." />
                        <Input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24" placeholder="Preu" />
                        <div className="w-24 text-right font-mono pt-2">€{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                ))}
            </div>
            
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4"><BookPlus className="w-4 h-4 mr-2" />Afegir Concepte</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 glass-effect">
                    {isCreating ? (
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">Crear i desar nou concepte</p>
                            <Input placeholder="Nom del concepte" value={newProduct.name} onChange={(e) => setNewProduct(p => ({...p, name: e.target.value}))} />
                            <Input type="number" placeholder="Preu (€)" value={newProduct.price} onChange={(e) => setNewProduct(p => ({...p, price: e.target.value}))} />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel·lar</Button>
                                <Button size="sm" onClick={handleSaveNewProduct} disabled={isSavingProduct}>Desar i Afegir</Button>
                            </div>
                        </div>
                    ) : (
                        <Command>
                            <CommandInput placeholder="Buscar concepte..." />
                            <CommandList>
                                <CommandEmpty>No s'ha trobat cap concepte.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem onSelect={() => handleAddItem()}><Plus className="mr-2 h-4 w-4" /><span>Afegir concepte manual</span></CommandItem>
                                    <CommandItem onSelect={() => setIsCreating(true)}><Save className="mr-2 h-4 w-4" /><span>Crear i desar nou concepte</span></CommandItem>
                                    {products.map((product) => (
                                        <CommandItem key={product.id} value={product.name} onSelect={() => handleAddProduct(product)}>
                                            <div className="flex justify-between w-full"><span>{product.name}</span><span className="text-muted-foreground">€{product.price}</span></div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
};