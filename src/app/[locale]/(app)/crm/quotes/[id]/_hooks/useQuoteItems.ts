"use client";

import { useState, useTransition } from "react";
import { toast } from 'sonner';
import { createProductAction } from '../actions';
import type { QuoteItem, Product } from '@/types/crm';

type UseQuoteItemsProps = {
    items: QuoteItem[];
    setItems: (newItems: QuoteItem[]) => void;
    userId: string;
    onAddNewItem: () => void;
    t: (key: string) => string;
};

export function useQuoteItems({ items, setItems, userId, onAddNewItem, t }: UseQuoteItemsProps) {
    const [isSavingProduct, startSaveProductTransition] = useTransition();
    const [isCreating, setIsCreating] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleItemChange = <K extends keyof QuoteItem>(index: number, field: K, value: QuoteItem[K]) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleAddProduct = (product: Product) => {
        const newItem: QuoteItem = {
            description: product.name || product.description || '',
            quantity: 1,
            unit_price: product.price || 0,
            product_id: product.id,
            user_id: userId
        };
        setItems([...items, newItem]);
        setIsPopoverOpen(false);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

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
            } else {
                toast.error("Error", { description: result.message });
            }
        });
    };

    const handleManualItem = () => {
        onAddNewItem();
        setIsPopoverOpen(false);
    };

    return {
        isSavingProduct,
        isCreating, setIsCreating,
        newProduct, setNewProduct,
        isPopoverOpen, setIsPopoverOpen,
        handleItemChange,
        handleAddProduct,
        handleRemoveItem,
        handleSaveNewProduct,
        handleManualItem,
    };
}