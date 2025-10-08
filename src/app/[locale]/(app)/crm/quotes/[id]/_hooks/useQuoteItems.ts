// /_hooks/useQuoteItems.ts (VERSIÓ FINAL I CORRECTA)
"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from 'sonner';
import { createProductAction } from '../actions';
import type { QuoteItem, Product } from '@/types/crm';

// ✅ 1. Definim les props correctes. Només necessita 'onItemsChange'.
interface UseQuoteItemsProps {
    items: QuoteItem[];
    onItemsChange: (newItems: QuoteItem[]) => void;
    userId: string;
    t: (key: string) => string;
};

// ✅ 2. Desestructurem 'onItemsChange' i eliminem les props antigues.
export function useQuoteItems({ items, onItemsChange, userId, t }: UseQuoteItemsProps) {
    const [isSavingProduct, startSaveProductTransition] = useTransition();
    const [isCreating, setIsCreating] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Totes aquestes funcions ara criden a 'onItemsChange' per notificar al pare.
    const handleItemChange = useCallback(<K extends keyof QuoteItem>(index: number, field: K, value: QuoteItem[K]) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onItemsChange(newItems);
    }, [items, onItemsChange]);

    const handleAddProduct = useCallback((product: Product) => {
        const newItem: QuoteItem = {
            description: product.name || product.description || '',
            quantity: 1,
            unit_price: product.price || 0,
            product_id: product.id,
            user_id: userId
        };
        onItemsChange([...items, newItem]);
        setIsPopoverOpen(false);
    }, [items, onItemsChange, userId]);

    const handleRemoveItem = useCallback((index: number) => {
        onItemsChange(items.filter((_, i) => i !== index));
    }, [items, onItemsChange]);
    
    const handleManualItem = useCallback(() => {
        const newItem: QuoteItem = {
            product_id: null, description: '', quantity: 1,
            unit_price: 0, user_id: userId
        };
        onItemsChange([...items, newItem]);
        setIsPopoverOpen(false);
    }, [items, onItemsChange, userId]);

    const handleSaveNewProduct = useCallback(() => {
        if (!newProduct.name || !newProduct.price) {
            toast.error(t('toast.requiredFields'), { description: t('toast.requiredFieldsDesc') });
            return;
        }
        startSaveProductTransition(async () => {
            const result = await createProductAction({ name: newProduct.name, price: parseFloat(newProduct.price) });
            // ✅ A la resposta de l'acció, la dada del producte ve a 'result.data'
            if (result.success && result.data) {
                toast.success(t('toast.productCreated'), { description: t('toast.productCreatedDesc') });
                // 'result.data' és el nou producte, el passem a handleAddProduct
                handleAddProduct(result.data as Product);
                setNewProduct({ name: '', price: '' });
                setIsCreating(false);
            } else {
                toast.error("Error", { description: result.message });
            }
        });
    }, [newProduct, t, handleAddProduct]);


    return {
        isSavingProduct, isCreating, setIsCreating, newProduct, setNewProduct,
        isPopoverOpen, setIsPopoverOpen, handleItemChange, handleAddProduct,
        handleRemoveItem, handleSaveNewProduct, handleManualItem,
    };
}