"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { PlusCircle, List, LayoutGrid } from "lucide-react";
import type { Product } from "@/types/crm/products";
import { deleteProduct } from "../actions";
import { ProductForm } from "./ProductForm";
import { ProductsTableView } from "./ProductsTableView";
import { ProductsCardView } from "./ProductsCardView";
import { useTranslations } from "next-intl";
/**
 * Component principal i interactiu de la pàgina de "Conceptes".
 * S'encarrega de:
 * - Gestionar els estats de la UI (terme de cerca, filtre, mode de vista).
 * - Filtrar les dades rebudes del servidor.
 * - Renderitzar la vista adequada (taula o targetes).
 * - Gestionar l'obertura del diàleg de creació/edició.
 */
export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const t = useTranslations('ProductsPage');

    // Estats per a la gestió del diàleg d'edició/creació.
    const [isFormOpen, setFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Estats per a la interactivitat de la llista.
    const [searchTerm, setSearchTerm] = useState("");
     // ✅ 1. L'estat ara utilitza un valor intern i neutre: "all".
     const [categoryFilter, setCategoryFilter] = useState("all");
     const [viewMode, setViewMode] = useState<"list" | "card">("list");

    // 'useMemo' per a optimitzar la generació de la llista de categories úniques.
    // Aquest càlcul només es farà de nou si 'initialProducts' canvia.
    const categories = useMemo(() => {
        const uniqueCategories = new Set(initialProducts.map(p => p.category).filter((c): c is string => !!c));
        // ✅ 2. La llista de categories també utilitza el valor neutre "all".
        return ["all", ...Array.from(uniqueCategories)];
    }, [initialProducts]);
    
    // 'useMemo' per a optimitzar el filtratge de productes. La llista només es
    // recalcularà si canvien els productes inicials o algun dels filtres.
    const filteredProducts = useMemo(() => {
        return initialProducts
            .filter(p => p.is_active) // Per defecte, només mostrem els productes actius.
            .filter(p => categoryFilter === "all" || p.category === categoryFilter)
            .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [initialProducts, categoryFilter, searchTerm]);

    // Funcions per gestionar les accions de l'usuari.
    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setSelectedProduct(null);
        setFormOpen(true);
    };

    const handleDelete = async (id: string) => {
         // ✅ CORRECCIÓ: Cridem l'acció sense guardar el resultat a 'result'.
         await deleteProduct(id);
        // Aquí podríem afegir una gestió d'errors més detallada si calgués.
        toast.success(t('toast.success'), { description: t('toast.productDeleted') });
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild><Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />{t('newConceptButton')}</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader><DialogTitle>{selectedProduct ? t('form.editTitle') : t('form.createTitle')}</DialogTitle></DialogHeader>
                        <ProductForm product={selectedProduct} onSuccess={() => setFormOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <Input placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder={t('categoryFilterPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                        {/* ✅ 4. La traducció es fa només aquí, a la part visual. */}
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat === 'all' ? t('allCategories') : cat}
                            </SelectItem>
                        ))}
                    </SelectContent>                </Select>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value: "list" | "card") => value && setViewMode(value)} className="ml-auto">
                    <ToggleGroupItem value="list" aria-label={t('listView')}><List className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="card" aria-label={t('cardView')}><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
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