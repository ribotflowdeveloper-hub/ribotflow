// /app/[locale]/(app)/crm/quotes/[id]/_hooks/useQuoteItems.ts (CORREGIT)
"use client";

import { useState, useTransition, useCallback } from "react";
import { toast } from 'sonner';
import { createProductAction } from '../actions';
import { type Database } from '@/types/supabase';

// Definim els tipus a partir de la BD.
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface UseQuoteItemsProps {
    items: Partial<QuoteItem>[];
    onItemsChange: (newItems: Partial<QuoteItem>[]) => void;
    userId: string;
    t: (key: string) => string;
};

export function useQuoteItems({ items, onItemsChange, userId, t }: UseQuoteItemsProps) {
    const [isSavingProduct, startSaveProductTransition] = useTransition();
    const [isCreating, setIsCreating] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
            // La propietat 'total' es calcula a partir de quantity i unit_price.
            total: product.price || 0 
            // ⛔ SOLUCIÓ: La propietat 'tax_rate' s'ha eliminat perquè no existeix a la taula 'quote_items'.
        };
        onItemsChange([...items, newItem]);
        setIsPopoverOpen(false);
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
            total: 0
            // ⛔ 'tax_rate' eliminat.
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
            if (result.success && result.data) {
                toast.success(t('toast.productCreated'), { description: t('toast.productCreatedDesc') });
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