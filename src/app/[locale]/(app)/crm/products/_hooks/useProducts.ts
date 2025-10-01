"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Product } from "@/types/crm/products";
import { deleteProduct } from "../actions";

// Tipus per a les props que el hook necessita
type UseProductsProps = {
    initialProducts: Product[];
    t: (key: string) => string; // Per a les traduccions
};

export function useProducts({ initialProducts, t }: UseProductsProps) {
    const router = useRouter(); // router.refresh() és millor que window.location.reload()
    const [isPending, startTransition] = useTransition();

    // Estats per a la gestió del diàleg d'edició/creació.
    const [isFormOpen, setFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Estats per a la interactivitat de la llista.
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [viewMode, setViewMode] = useState<"list" | "card">("list");

    // Dades derivades amb 'useMemo'
    const categories = useMemo(() => {
        const uniqueCategories = new Set(initialProducts.map(p => p.category).filter((c): c is string => !!c));
        return ["all", ...Array.from(uniqueCategories)];
    }, [initialProducts]);
    
    const filteredProducts = useMemo(() => {
        return initialProducts
            .filter(p => p.is_active)
            .filter(p => categoryFilter === "all" || p.category === categoryFilter)
            .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [initialProducts, categoryFilter, searchTerm]);

    // Handlers
    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedProduct(null);
        setFormOpen(true);
    };

    const handleDelete = (id: number) => {
        startTransition(async () => {
            const result = await deleteProduct(id);
            if (result.success) {
                toast.success(t('toast.success'), { description: result.message });
                router.refresh(); // Refresquem les dades del servidor
            } else {
                toast.error(t('toast.error'), { description: result.message });
            }
        });
    };

    const handleSuccess = () => {
        setFormOpen(false);
        router.refresh();
    };
    
    // Retornem tot el que el component de presentació necessita
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
        t
    };
}