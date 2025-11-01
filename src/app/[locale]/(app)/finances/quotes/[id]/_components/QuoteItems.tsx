// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteItems.tsx (REFACTORITZAT)
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslations } from 'next-intl';
import { type Database } from '@/types/supabase';
import { useQuoteItems } from '../_hooks/useQuoteItems';

// ✅ Importem el component reutilitzable
import { ProductSelector } from '@/components/shared/ProductSelector';

// --- Tipus Derivats de la Base de Dades ---
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface QuoteItemsProps {
    items: Partial<QuoteItem>[];
    onItemsChange: (newItems: Partial<QuoteItem>[]) => void;
    products: Product[];
    userId: string;
}

export const QuoteItems: React.FC<QuoteItemsProps> = (props) => {
    const t = useTranslations('QuoteEditor.items');

    // ✅ Creem una funció 't' específica per al selector.
    // Això assumeix que les teves traduccions estan a "QuoteEditor.items.productSelector.*"
    // Ex: "QuoteEditor.items.productSelector.addButton"
    const t_selector = (key: string) => t(`productSelector.${key}`);

    const {
        // ⛔ Aquests estats/handlers ja no existeixen aquí
        // isSavingProduct, isCreating, setIsCreating,
        // newProduct, setNewProduct, isPopoverOpen, setIsPopoverOpen,
        // handleSaveNewProduct,

        // ✅ Aquests són els handlers que utilitzarem
        handleItemChange,
        handleAddProduct, // Callback per ProductSelector
        handleRemoveItem,
        handleManualItem    // Callback per ProductSelector
    } = useQuoteItems({
        items: props.items,
        onItemsChange: props.onItemsChange,
        userId: props.userId
    });

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
                            value={item.description || ''}
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

            {/* ✅ Aquí substituïm tot el Popover/Command/Form pel nou component */}
            <ProductSelector
                products={props.products}
                onProductSelect={handleAddProduct}
                onManualAdd={handleManualItem}
                t={t_selector}
            />
            {/* ⛔ Tot el codi antic de <Popover>...</Popover> s'ha eliminat */}
        </div>
    );
};