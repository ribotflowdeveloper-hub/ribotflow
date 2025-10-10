"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, List, LayoutGrid, Loader2, FilePlus2, Upload, Download } from "lucide-react";
import type { Product } from "@/types/crm/products";
import { ProductForm } from "./ProductForm";
import { ProductsTableView } from "./ProductsTableView";
import { ProductsCardView } from "./ProductsCardView";
import { useTranslations } from "next-intl";
import { useProducts } from "../_hooks/useProducts"; // ✅ 1. Importem el nostre nou hook

import { startTransition } from "react";
import { toast } from "sonner";
import { exportToExcel, importFromExcel } from '@/app/[locale]/(app)/excel/actions';
import ExcelDropdownButton, { DropdownOption } from '@/app/[locale]/(app)/excel/ExcelDropdownButton';

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const t = useTranslations('ProductsPage');
    const t2 = useTranslations('excel');
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

    const excelOptions: DropdownOption[] = [
        { value: 'create', label: t2('products.create'), icon: FilePlus2 },
        { value: 'load', label: t2('products.load'), icon: Upload },
        { value: 'download', label: t2('products.download'), icon: Download },
    ];

    async function handleExportAndDownload(shouldDownload: boolean) {
        toast.info(t2('products.startingexport'));
        try {
            const result = await exportToExcel('products', shouldDownload);

            if (result.success && result.fileBuffer) {
                const byteCharacters = atob(result.fileBuffer);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = result.fileName || 'export.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast.success(t2('successexport'));
            } else {
                toast.error(t2('errorexport'), { description: result.message });
            }
        } catch (error) {
            toast.error(t2('unexpectederror'), { description: t2('couldnotcomplete') });
            console.error(error);
        }
    }

    /* Funció del costat del client per iniciar el procés d'importació.
    * Crea un input de fitxers i el llança.
     */
    function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                toast.error(t2('nofileselected'));
                return;
            }

            toast.info(t2('processingfile'));

            const formData = new FormData();
            formData.append('file', file);

            startTransition(async () => {
                try {
                    const result = await importFromExcel('products', formData);

                    if (result.success) {
                        toast.success(result.message);
                    } else {
                        toast.error(t2('errorloadingdata'), { description: result.message });
                    }
                } catch (error) {
                    toast.error(t2('unexpectederrorloadingfile'), { description: (error as Error).message });
                }
            });
        };

        input.click();
    }

    const handleExcelAction = (option: DropdownOption) => {
        switch (option.value) {
            case 'download':
                startTransition(() => handleExportAndDownload(true)); // ➡️ ARA ES CRIDA startTransition
                break;
            case 'create':
                startTransition(() => handleExportAndDownload(false)); // ➡️ I AQUÍ TAMBÉ
                break;
            case 'load':
                handleImport();
                break;
            default:
                break;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                {/* Contenidor per agrupar els botons d'acció */}
                <div className="flex items-center gap-2">
                    <ExcelDropdownButton
                        options={excelOptions}
                        onSelect={handleExcelAction}
                    />
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