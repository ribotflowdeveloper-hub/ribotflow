// /app/[locale]/(app)/crm/products/_components/ProductsCardView.tsx (Refactoritzat)
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
// ✅ 1. Importem el tipus correcte.
import type { Product } from "./ProductsData";
import { useTranslations } from "next-intl";

interface ProductsCardViewProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void; // ✅ 2. La funció espera un 'number'.
}

export function ProductsCardView({ products, onEdit, onDelete }: ProductsCardViewProps) {
    const t = useTranslations('ProductsPage');

    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || t('uncategorized');
        if (!acc[category]) { acc[category] = []; }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    return (
        <div className="space-y-8">
            {Object.entries(groupedProducts).map(([category, productsInCategory]) => (
                <div key={category}>
                    <h2 className="text-xl font-bold mb-4">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {productsInCategory.map((product) => (
                            <Card key={product.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{product.name}</CardTitle>
                                    <CardDescription>{product.description || t('noDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="font-mono text-2xl font-bold">€{product.price.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{t('unitLabel', {unit: product.unit || "N/A"})} | {t('vatLabel', {iva: product.iva || 0})}</p>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(product)}><Edit className="mr-2 h-4 w-4"/>{t('editButton')}</Button>
                                    
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4"/>{t('deleteButton')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                                                <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('deleteDialog.cancelButton')}</AlertDialogCancel>
                                                {/* ✅ 3. Passem l'ID numèric directament. */}
                                                <AlertDialogAction onClick={() => onDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    {t('deleteDialog.confirmButton')}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}