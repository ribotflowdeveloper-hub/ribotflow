// /app/[locale]/(app)/crm/products/_hooks/useProducts.ts (Refactoritzat)
"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { toast } from 'sonner';
// ✅ 1. Importem el nou tipus des del seu origen correcte.
import type { Product } from "../_components/ProductsData";
import { deleteProduct } from "../actions";

type UseProductsProps = {
    initialProducts: Product[];
    t: (key: string) => string;
};

export function useProducts({ initialProducts, t }: UseProductsProps) {
    const [isPending, startTransition] = useTransition();
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [isFormOpen, setFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [viewMode, setViewMode] = useState<"list" | "card">("list");

    const categories = useMemo(() => {
        const uniqueCategories = new Set(products.map(p => p.category).filter((c): c is string => !!c));
        return ["all", ...Array.from(uniqueCategories)];
    }, [products]);
    
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => p.is_active)
            .filter(p => categoryFilter === "all" || p.category === categoryFilter)
            .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, categoryFilter, searchTerm]);

    const handleEdit = useCallback((product: Product) => {
        setSelectedProduct(product);
        setFormOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setSelectedProduct(null);
        setFormOpen(true);
    }, []);

    const handleDelete = useCallback((id: number) => {
        startTransition(async () => {
            const originalProducts = products;
            setProducts(currentProducts => currentProducts.filter(p => p.id !== id));
            
            const result = await deleteProduct(id);
            if (result.success) {
                toast.success(t('toast.success'), { description: result.message });
            } else {
                toast.error(t('toast.error'), { description: result.message });
                // ✅ En cas d'error, restaurem l'estat original.
                setProducts(originalProducts); 
            }
        });
    }, [t, products]); // ✅ Afegim 'products' a les dependències.

    const handleSuccess = useCallback((updatedOrNewProduct: Product) => {
        setFormOpen(false);
        setProducts(currentProducts => {
            const exists = currentProducts.some(p => p.id === updatedOrNewProduct.id);
            if (exists) {
                return currentProducts.map(p => p.id === updatedOrNewProduct.id ? updatedOrNewProduct : p);
            } else {
                return [updatedOrNewProduct, ...currentProducts];
            }
        });
    }, []);
    
    return {
        isFormOpen, setFormOpen,
        selectedProduct,
        searchTerm, setSearchTerm,
        categoryFilter, setCategoryFilter,
        viewMode, setViewMode,
        categories,
        filteredProducts,
        isPending,
        handleEdit,
        handleCreate,
        handleDelete,
        handleSuccess,
    };
}