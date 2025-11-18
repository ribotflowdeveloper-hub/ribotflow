"use client";

import { useCallback } from "react";
// ✅ Importem els tipus globals correctes
import { type Product } from "@/types/finances/quotes";
import { type QuoteItem } from "@/types/finances/quotes";
interface UseQuoteItemsProps {
    items: Partial<QuoteItem>[];
    onItemsChange: (newItems: Partial<QuoteItem>[]) => void;
    userId: string;
};

export function useQuoteItems({ items, onItemsChange, userId }: UseQuoteItemsProps) {
    
    const handleItemChange = useCallback(<K extends keyof QuoteItem>(index: number, field: K, value: QuoteItem[K]) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onItemsChange(newItems);
    }, [items, onItemsChange]);

    const handleAddProduct = useCallback((product: Product) => {
        const newItem: Partial<QuoteItem> = {
            description: product.name || product.description || '',
            quantity: 1,
            unit_price: product.price || 0,
            product_id: product.id,
            user_id: userId,
            total: product.price || 0,
            // ✅ IMPORTANT: Inicialitzem taxes buit si no existeix
            taxes: [] 
        };
        onItemsChange([...items, newItem]);
    }, [items, onItemsChange, userId]);

    const handleRemoveItem = useCallback((index: number) => {
        onItemsChange(items.filter((_, i) => i !== index));
    }, [items, onItemsChange]);
    
    const handleManualItem = useCallback(() => {
        const newItem: Partial<QuoteItem> = {
            product_id: null,
            description: '',
            quantity: 1,
            unit_price: 0,
            user_id: userId,
            total: 0,
            taxes: []
        };
        onItemsChange([...items, newItem]);
    }, [items, onItemsChange, userId]);

    return {
        handleItemChange, 
        handleAddProduct,
        handleRemoveItem, 
        handleManualItem,
    };
}