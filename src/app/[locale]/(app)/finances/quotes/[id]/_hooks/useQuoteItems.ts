// /app/[locale]/(app)/crm/quotes/[id]/_hooks/useQuoteItems.ts (REFACTORITZAT)
"use client";

import { useCallback } from "react";
import { type Database } from '@/types/supabase';

// Definim els tipus a partir de la BD.
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface UseQuoteItemsProps {
    items: Partial<QuoteItem>[];
    onItemsChange: (newItems: Partial<QuoteItem>[]) => void;
    userId: string;
    // ⛔ 't' ja no és necessari aquí, es passa directament al ProductSelector
};

export function useQuoteItems({ items, onItemsChange, userId }: UseQuoteItemsProps) {
    // ⛔ Tota la lògica de 'isSavingProduct', 'isCreating', 'newProduct', 'isPopoverOpen'
    // i 'handleSaveNewProduct' s'ha mogut al component reutilitzable 'ProductSelector'.

    const handleItemChange = useCallback(<K extends keyof QuoteItem>(index: number, field: K, value: QuoteItem[K]) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onItemsChange(newItems);
    }, [items, onItemsChange]);

    /**
     * Afegeix un producte de la llibreria a la llista d'ítems.
     * Aquesta funció es passa com a callback 'onProductSelect' a ProductSelector.
     */
    const handleAddProduct = useCallback((product: Product) => {
        const newItem: Partial<QuoteItem> = {
            description: product.name || product.description || '',
            quantity: 1,
            unit_price: product.price || 0,
            product_id: product.id,
            user_id: userId,
            total: product.price || 0 
        };
        onItemsChange([...items, newItem]);
    }, [items, onItemsChange, userId]);

    const handleRemoveItem = useCallback((index: number) => {
        onItemsChange(items.filter((_, i) => i !== index));
    }, [items, onItemsChange]);
    
    /**
     * Afegeix un ítem manual buit a la llista.
     * Aquesta funció es passa com a callback 'onManualAdd' a ProductSelector.
     */
    const handleManualItem = useCallback(() => {
        const newItem: Partial<QuoteItem> = {
            product_id: null,
            description: '',
            quantity: 1,
            unit_price: 0,
            user_id: userId,
            total: 0
        };
        onItemsChange([...items, newItem]);
    }, [items, onItemsChange, userId]);

    return {
        // Estats i handlers moguts:
        // isSavingProduct, isCreating, setIsCreating, newProduct, setNewProduct,
        // isPopoverOpen, setIsPopoverOpen, handleSaveNewProduct

        // Handlers que es mantenen:
        handleItemChange, 
        handleAddProduct,
        handleRemoveItem, 
        handleManualItem,
    };
}