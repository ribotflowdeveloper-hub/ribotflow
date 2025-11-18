"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslations } from 'next-intl';
// ✅ Importem els tipus globals correctes
import { type Product } from "@/types/finances/quotes";
import { type QuoteItem } from "@/types/finances/quotes";
// ✅ Importem TOTS els tipus des del fitxer global
import { type TaxRate } from "@/types/finances/index";
import { useQuoteItems } from '../_hooks/useQuoteItems';
import { ItemTaxSelector } from '@/components/features/taxs/ItemTaxSelector';
import { ProductSelector } from '@/components/shared/ProductSelector';
import { calculateLineTotal } from "../_hooks/quoteCalculations"; // Importem el helper
interface QuoteItemsProps {
    items: Partial<QuoteItem>[];
    onItemsChange: (newItems: Partial<QuoteItem>[]) => void;
    products: Product[];
    userId: string;
    availableTaxes: TaxRate[];
}

export const QuoteItems: React.FC<QuoteItemsProps> = (props) => {
    const t = useTranslations('QuoteEditor.items');
    const t_selector = (key: string) => t(`productSelector.${key}`);

    const {
        handleItemChange,
        handleAddProduct,
        handleRemoveItem,
        handleManualItem
    } = useQuoteItems({
        items: props.items,
        onItemsChange: props.onItemsChange,
        userId: props.userId
    });

    const handleTaxesChange = (index: number, newTaxes: TaxRate[]) => {
        const updatedItems = [...props.items];
        updatedItems[index] = {
            ...updatedItems[index],
            taxes: newTaxes
        };
        props.onItemsChange(updatedItems);
    };



    function formatCurrency(amount: number): React.ReactNode {
        return amount.toLocaleString(undefined, {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    return (
        <div className="p-4">
            <h3 className="font-semibold text-lg mb-4">{t('title')}</h3>
            <div className="space-y-4">
                {props.items.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                        {t('empty')}
                    </div>
                )}
                {props.items.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row items-start gap-2 border-b pb-4 mb-4 md:border-0 md:pb-0 md:mb-0">

                        <TextareaAutosize
                            placeholder={t('placeholderDescription')}
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            minRows={1}
                            className="flex w-full md:w-auto flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[200px]"
                        />

                        <Input
                            type="number"
                            value={item.quantity ?? 1}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-20"
                            placeholder="Qty"
                        />

                        <Input
                            type="number"
                            value={item.unit_price ?? 0}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24"
                            placeholder="Price"
                        />

                        {/* Selector d'Impostos */}
                        <div className="w-40">
                            <ItemTaxSelector
                                selectedTaxes={item.taxes || []}
                                onChange={(newTaxes) => handleTaxesChange(index, newTaxes)}
                                availableTaxes={props.availableTaxes}
                            />
                        </div>

                        {/* ✅ TOTAL VISUAL (Calculat amb taxes) */}
                        <div className="w-24 text-right font-mono pt-2 text-sm font-medium">
                            {formatCurrency(calculateLineTotal(item))}                        
                            </div>

                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <ProductSelector
                    products={props.products}
                    onProductSelect={handleAddProduct}
                    onManualAdd={handleManualItem}
                    t={t_selector}
                />
            </div>
        </div>
    );
};