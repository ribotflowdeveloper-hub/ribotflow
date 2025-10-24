// /app/[locale]/(app)/crm/products/_components/ProductsTableView.tsx (Refactoritzat)
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
// ✅ 1. Importem el tipus correcte.
import type { Product } from "./ProductsData";
import { useTranslations } from "next-intl";

interface ProductsTableViewProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void; // ✅ 2. La funció espera un 'number'.
}

export function ProductsTableView({ products, onEdit, onDelete }: ProductsTableViewProps) {
    const t = useTranslations('ProductsPage');
    
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('table.name')}</TableHead>
                        <TableHead>{t('table.category')}</TableHead>
                        <TableHead className="text-right">{t('table.price')}</TableHead>
                        <TableHead className="text-right">{t('table.unit')}</TableHead>
                        <TableHead className="w-[100px] text-right">{t('table.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.length > 0 ? (
                        products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-muted-foreground">{product.category || "-"}</TableCell>
                                <TableCell className="text-right font-mono">€{(product.price || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right">{product.unit || "-"}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                                                    <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('deleteDialog.cancelButton')}</AlertDialogCancel>
                                                    {/* ✅ 3. Passem l'ID numèric. */}
                                                    <AlertDialogAction onClick={() => onDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        {t('deleteDialog.confirmButton')}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {t('noProductsFound')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}