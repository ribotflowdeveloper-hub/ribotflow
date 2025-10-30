// src/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoiceItemsEditor.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { type InvoiceItem } from '@/types/finances/invoices'; // Ajusta la ruta
import { formatCurrency } from '@/lib/utils/formatters'; // Per mostrar totals
// Opcional: Si vols un selector de productes
// import { ProductCombobox } from '@/components/shared/ProductCombobox';

interface InvoiceItemsEditorProps {
    items: InvoiceItem[];
    onItemChange: <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => void;
    onRemoveItem: (index: number) => void;
    isSaving: boolean;
    // Opcional: Passa productes si tens un selector
    // products: { id: number | string; name: string; price: number }[];
    currency?: string;
    locale?: string;
}

export function InvoiceItemsEditor({
    items,
    onItemChange,
    onRemoveItem,
    isSaving,
    // products,
    currency = 'EUR',
    locale = 'ca',
}: InvoiceItemsEditorProps) {

    // Funció auxiliar per gestionar canvis numèrics
    const handleNumericChange = (index: number, field: 'quantity' | 'unit_price', value: string) => {
        const numericValue = parseFloat(value);
        // Permetem 0 però no NaN o negatius (ajusta segons necessitats)
        if (!isNaN(numericValue) && numericValue >= 0) {
            onItemChange(index, field, numericValue);
        } else if (value === '') {
             onItemChange(index, field, 0); // O null si prefereixes
        }
        // Si no és vàlid, no fem res (mantenim valor anterior)
    };

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {/* Opcional: Capçalera per a selector de Producte */}
                        {/* <TableHead className="w-[200px]">Producte</TableHead> */}
                        <TableHead>Descripció</TableHead>
                        <TableHead className="w-[100px] text-right">Quantitat</TableHead>
                        <TableHead className="w-[120px] text-right">Preu Unitari</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"><span className="sr-only">Esborrar</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => (
                        // ✅ CORRECCIÓ: Els comentaris s'han tret d'aquí
                        <TableRow key={item.id}> 
                            {/* Opcional: Cel·la per a selector de Producte */}
                            {/* <TableCell>
                                <ProductCombobox
                                    value={item.product_id}
                                    onChange={(productId, product) => {
                                        // Omple automàticament descripció i preu
                                        onItemChange(index, 'product_id', productId);
                                        onItemChange(index, 'description', product?.name || item.description);
                                        onItemChange(index, 'unit_price', product?.price || item.unit_price);
                                    }}
                                    products={products}
                                    disabled={isSaving}
                                />
                            </TableCell> 
                            */}
                            <TableCell>
                                <Input
                                    value={item.description || ''}
                                    onChange={(e) => onItemChange(index, 'description', e.target.value)}
                                    placeholder="Descripció del servei o producte"
                                    disabled={isSaving}
                                    className="min-w-[200px]" // Amplada mínima per a descripció
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleNumericChange(index, 'quantity', e.target.value)}
                                    disabled={isSaving}
                                    className="text-right"
                                    step="any" // Permet decimals si cal
                                    min="0"
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <Input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => handleNumericChange(index, 'unit_price', e.target.value)}
                                    disabled={isSaving}
                                    className="text-right"
                                    step="0.01" // Precisió de cèntims
                                    min="0"
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrency(item.quantity * item.unit_price, currency, locale)}
                            </TableCell>
                            <TableCell>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemoveItem(index)}
                                    disabled={isSaving}
                                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Esborrar línia</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {items.length === 0 && (
                 <p className="text-center text-sm text-muted-foreground py-4">
                    No hi ha cap línia afegida. Fes clic a "+ Afegir Línia" per començar.
                 </p>
            )}
        </div>
    );
}