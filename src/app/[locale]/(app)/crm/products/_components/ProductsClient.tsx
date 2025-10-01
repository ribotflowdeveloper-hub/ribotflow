"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, List, LayoutGrid, Loader2 } from "lucide-react";
import type { Product } from "@/types/crm/products";
import { ProductForm } from "./ProductForm";
import { ProductsTableView } from "./ProductsTableView";
import { ProductsCardView } from "./ProductsCardView";
import { useTranslations } from "next-intl";
import { useProducts } from "../_hooks/useProducts"; // ✅ 1. Importem el nostre nou hook

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const t = useTranslations('ProductsPage');

    // ✅ 2. Tota la lògica i estats venen del hook.
    const {
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
    } = useProducts({ initialProducts, t });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />{t('newConceptButton')}</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader><DialogTitle>{selectedProduct ? t('form.editTitle') : t('form.createTitle')}</DialogTitle></DialogHeader>
                        <ProductForm product={selectedProduct} onSuccess={handleSuccess} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <Input placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder={t('categoryFilterPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat === 'all' ? t('allCategories') : cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value: "list" | "card") => value && setViewMode(value)} className="ml-auto">
                    <ToggleGroupItem value="list" aria-label={t('listView')}><List className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="card" aria-label={t('cardView')}><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div>
                {isPending ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : viewMode === 'list' ? (
                    <ProductsTableView products={filteredProducts} onEdit={handleEdit} onDelete={(id) => handleDelete(Number(id))} />
                ) : (
                    <ProductsCardView products={filteredProducts} onEdit={handleEdit} onDelete={(id) => handleDelete(Number(id))} />
                )}
            </div>
        </div>
    );
}