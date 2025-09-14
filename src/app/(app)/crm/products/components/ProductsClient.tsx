"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { PlusCircle, List, LayoutGrid } from "lucide-react";

import type { Product } from "../page";
import { deleteProduct } from "../actions";

import { ProductForm } from "./ProductForm";
import { ProductsTableView } from "./ProductsTableView";
import { ProductsCardView } from "./ProductsCardView";

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const [isFormOpen, setFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Totes");
    const [viewMode, setViewMode] = useState<"list" | "card">("list");

    const categories = useMemo(() => {
        const categoriesWithNulls = initialProducts.map(p => p.category);
        // ✅ CORRECCIÓ: Aquesta és la forma més segura de filtrar 'nulls' per a TypeScript.
        const uniqueCategories = new Set(categoriesWithNulls.filter((c): c is string => c != null));
        return ["Totes", ...Array.from(uniqueCategories)];
    }, [initialProducts]);

    const filteredProducts = useMemo(() => {
        return initialProducts
            .filter(p => p.is_active)
            .filter(p => {
                if (categoryFilter === "Totes") return true;
                return p.category === categoryFilter;
            })
            .filter(p => {
                if (!searchTerm) return true;
                return p.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
    }, [initialProducts, categoryFilter, searchTerm]);

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedProduct(null);
        setFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        const result = await deleteProduct(id);
        toast.success('Exit!', { description: 'Producte eliminat correctament.' });

    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Conceptes</h1>
                    <p className="text-muted-foreground">Gestiona la teva llista de productes i serveis reutilitzables.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nou Concepte
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{selectedProduct ? "Editar Concepte" : "Crear Nou Concepte"}</DialogTitle>
                        </DialogHeader>
                        <ProductForm product={selectedProduct} onSuccess={() => setFormOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <Input
                    placeholder="Cercar per nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filtrar per categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value: "list" | "card") => value && setViewMode(value)} className="ml-auto">
                    <ToggleGroupItem value="list" aria-label="Vista de llista"><List className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="card" aria-label="Vista de targetes"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div>
                {viewMode === 'list' ? (
                    <ProductsTableView products={filteredProducts} onEdit={handleEdit} onDelete={handleDelete} />
                ) : (
                    <ProductsCardView products={filteredProducts} onEdit={handleEdit} onDelete={handleDelete} />
                )}
            </div>
        </div>
    );
}