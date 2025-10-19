// src/app/[locale]/(app)/finances/despeses/[expenseId]/_components/ExpenseItemsEditor.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ExpenseItem } from '@/types/finances/expenses';
import { useTranslations } from 'next-intl';

interface ExpenseItemsEditorProps {
    items: ExpenseItem[];
    onItemChange: (index: number, field: keyof ExpenseItem, value: string | number) => void;
    onRemoveItem: (index: number) => void;
    isSaving: boolean;
}

export function ExpenseItemsEditor({ items, onItemChange, onRemoveItem, isSaving }: ExpenseItemsEditorProps) {
    const t = useTranslations('ExpenseDetailPage.items');
    return (
        <div className="space-y-4">
            {/* Header de la Taula */}
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <span className="col-span-6">{t('description')}</span>
                <span className="col-span-2 text-right">{t('quantity')}</span>
                <span className="col-span-2 text-right">{t('unitPrice')}</span>
                <span className="col-span-2 px-10 text-right">{t('total')}</span>
                <span className="w-8"></span> {/* Columna buida per al botó d'esborrar */}
            </div>

            {items.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-12 gap-2 items-center">
                    {/* Descripció */}
                    <div className="col-span-6">
                        <Input
                            placeholder={t('placeholder.description')}
                            value={item.description}
                            onChange={(e) => onItemChange(index, 'description', e.target.value)}
                            disabled={isSaving}
                        />
                    </div>

                    {/* Quantitat */}
                    <div className="col-span-2">
                        <Input
                            type="number"
                            placeholder="0"
                            value={item.quantity || 0}
                            onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={isSaving}
                            className="text-right"
                            step="any"
                        />
                    </div>

                    {/* Preu Unitari */}
                    <div className="col-span-2">
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={item.unit_price || 0}
                            onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            disabled={isSaving}
                            className="text-right"
                            step="0.01"
                        />
                    </div>

                    {/* Total (Lectura) */}
                    <div className="col-span-2 text-right font-medium">
                        {item.total ? item.total.toFixed(2) : '0.00'}              
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveItem(index)}
                            disabled={isSaving}
                            className="w-8 h-8 text-red-500 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                </div>
            ))}

            {items.length === 0 && (
                <p className="text-center text-muted-foreground py-4">{t('emptyState')}</p>
            )}
        </div>
    );
}