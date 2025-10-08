"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, BookPlus, Save, Loader2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import type { QuoteItem, Product } from '@/types/crm';
import { useTranslations } from 'next-intl';
import { useQuoteItems } from '../_hooks/useQuoteItems'; // ✅ 1. Importem el hook

// ✅ 1. Definim les props correctes. 'onAddNewItem' ja no és necessària per separat.
interface QuoteItemsProps {
    items: QuoteItem[];
    onItemsChange: (newItems: QuoteItem[]) => void;
    products: Product[];
    userId: string;
}

// ✅ PAS 3.2: Canviem el nom de la prop que passem al hook
export const QuoteItems: React.FC<QuoteItemsProps> = (props) => {
    const t = useTranslations('QuoteEditor.items');

    // ✅ 2. Passem 'onItemsChange' directament al hook a través de '...props'
    const {
        isSavingProduct, isCreating, setIsCreating,
        newProduct, setNewProduct, isPopoverOpen, setIsPopoverOpen,
        handleItemChange, handleAddProduct, handleRemoveItem,
        handleSaveNewProduct, handleManualItem
    } = useQuoteItems({ ...props, t });

    return (
        <div className="p-4">
            <h3 className="font-semibold text-lg mb-4">{t('title')}</h3>
            <div className="space-y-2">
                {props.items.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                        {t('empty')}
                    </div>
                )}
                {props.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <TextareaAutosize
                            placeholder={t('placeholderDescription')}
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            minRows={1}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[300px]"
                        />
                        <Input type="number" value={item.quantity ?? 1} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)} className="w-20" />
                        <Input type="number" value={item.unit_price ?? 0} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24" />
                        <div className="w-24 text-right font-mono pt-2">€{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                ))}
            </div>

            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4"><BookPlus className="w-4 h-4 mr-2" />{t('addButton')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                    {isCreating ? (
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">{t('newProductTitle')}</p>
                            <Input placeholder={t('newProductNamePlaceholder')} value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} />
                            <Input type="number" placeholder={t('newProductPricePlaceholder')} value={newProduct.price} onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))} />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>{t('cancelButton')}</Button>
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
                                    <CommandItem onSelect={handleManualItem}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span>{t('addManualItem')}</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => setIsCreating(true)}>
                                        <Save className="mr-2 h-4 w-4" />
                                        <span>{t('createNewItem')}</span>
                                    </CommandItem>
                                    {props.products.map((product) => (
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