"use client";

import React, { useState, useTransition } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, BookPlus, Save, Loader2 } from 'lucide-react'; // ✅ Afegim Loader2
import TextareaAutosize from 'react-textarea-autosize';
import { createProductAction } from '../actions';
import type { QuoteItem, Product } from '@/types/crm';
import { useTranslations } from 'next-intl';

// ✅ PAS 1: Definim les props correctes que el component espera rebre del seu pare.
interface QuoteItemsProps {
    items: QuoteItem[];
    setItems: (newItems: QuoteItem[]) => void;
    products: Product[];
    userId: string; // <-- Rebem l'ID de l'usuari actual
    onAddNewItem: () => void; // <-- Rebem la funció per afegir un ítem des del pare
}

export const QuoteItems = ({ items, setItems, products, userId, onAddNewItem }: QuoteItemsProps) => {
    const t = useTranslations('QuoteEditor.items');
    const [isSavingProduct, startSaveProductTransition] = useTransition();
    const [isCreating, setIsCreating] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleItemChange = <K extends keyof QuoteItem>(
        index: number,
        field: K,
        value: QuoteItem[K]
    ) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    // ✅ PAS 2: Aquesta funció ara és més simple i només s'encarrega d'afegir productes
    // predefinits, ja que el botó "Afegir Concepte Manual" ara crida a 'onAddNewItem'.
    const handleAddProduct = (product: Product) => {
        const newItem: QuoteItem = {
            description: product.name || product.description || '',
            quantity: 1,
            unit_price: product.price || 0,
            product_id: product.id,
            user_id: userId // <-- Utilitzem el userId de les props
        };
        setItems([...items, newItem]);
        setIsPopoverOpen(false);
    };

    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleSaveNewProduct = () => {
        if (!newProduct.name || !newProduct.price) {
            toast.error(t('toast.requiredFields'), { description: t('toast.requiredFieldsDesc') });
            return;
        }
        startSaveProductTransition(async () => {
            const result = await createProductAction({ name: newProduct.name, price: parseFloat(newProduct.price) });
            if (result.success && result.newProduct) {
                toast.success(t('toast.productCreated'), { description: t('toast.productCreatedDesc') });
                handleAddProduct(result.newProduct);
                setNewProduct({ name: '', price: '' });
                setIsCreating(false);
                // router.refresh() ja no és tan necessari aquí si la revalidació a l'acció és correcta,
                // però el podem deixar per seguretat.
            } else {
                toast.error("Error", { description: result.message });
            }
        });
    }

    return (
        <div className="glass-card p-4">
            <h3 className="font-semibold text-lg mb-4">{t('title')}</h3>
            <div className="space-y-2">
                {items.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                        {t('empty')}
                    </div>
                )}
                {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <TextareaAutosize
                            placeholder={t('placeholderDescription')}
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            minRows={1}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[300px]"
                        />
                        <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)} className="w-20" placeholder={t('placeholderQty')} />
                        <Input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24" placeholder={t('placeholderPrice')} />
                        <div className="w-24 text-right font-mono pt-2">€{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                ))}
            </div>

            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4"><BookPlus className="w-4 h-4 mr-2" />{t('addButton')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 glass-effect">
                    {isCreating ? (
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">{t('newProductTitle')}</p>
                            <Input placeholder={t('newProductNamePlaceholder')} value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} />
                            <Input type="number" placeholder={t('newProductPricePlaceholder')} value={newProduct.price} onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))} />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>{t('cancelButton')}</Button>
                                {/* ✅ CORRECCIÓ: Afegim el onClick i el disabled basat en isSavingProduct */}
                                <Button size="sm" onClick={handleSaveNewProduct} disabled={isSavingProduct}>
                                    {isSavingProduct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {t('saveAndAddButton')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Command>
                            <CommandInput placeholder={t('searchPlaceholder')} />
                            <CommandList>
                                <CommandEmpty>{t('emptySearch')}</CommandEmpty>
                                <CommandGroup>
                                    {/* ✅ PAS 3: El botó d'afegir manualment ara crida a la funció del pare. */}
                                    <CommandItem onSelect={() => {
                                        onAddNewItem();
                                        setIsPopoverOpen(false);
                                    }}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span>{t('addManualItem')}</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => setIsCreating(true)}>
                                        <Save className="mr-2 h-4 w-4" />
                                        <span>{t('createNewItem')}</span>
                                    </CommandItem>
                                    {products.map((product) => (
                                        <CommandItem key={product.id} value={product.name} onSelect={() => handleAddProduct(product)}>
                                            <div className="flex justify-between w-full">
                                                <span>{product.name}</span>
                                                <span className="text-muted-foreground">€{product.price}</span>
                                            </div>
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