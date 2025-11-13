// src/app/[locale]/(app)/finances/expenses/[expenseId]/_components/ExpenseItemsEditor.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label'; // 👈 IMPORTAR
import { Loader2, Trash2 } from 'lucide-react';
import { type ExpenseItem, type TaxRate } from '@/types/finances/index'; // 👈 AFEGIR TaxRate
import { useTranslations } from 'next-intl';
import { ItemTaxSelector } from './ItemTaxSelector'; // 👈 IMPORTAR NOU COMPONENT

// ✅ MODIFICAT: Noves props
interface ExpenseItemsEditorProps {
    items: ExpenseItem[];
    availableTaxes: TaxRate[]; // Llista de tots els impostos
    isLoadingTaxes: boolean;
    onItemChange: (
        index: number,
        field: keyof ExpenseItem,
        value: string | number | ExpenseItem[keyof ExpenseItem]
    ) => void;
    onItemTaxesChange: (index: number, taxes: TaxRate[]) => void; // Nou handler
    onRemoveItem: (index: number) => void;
    isSaving: boolean;
}

export function ExpenseItemsEditor({ 
  items, 
  availableTaxes,
  isLoadingTaxes,
  onItemChange, 
  onItemTaxesChange,
  onRemoveItem, 
  isSaving 
}: ExpenseItemsEditorProps) {
    
    const t = useTranslations('ExpenseDetailPage.items');
    
    return (
        <div className="space-y-4">
            {/* Capçalera de la taula (només per a 'md' i més grans) */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <span className="col-span-4">{t('description')}</span>
                <span className="col-span-2 text-right">{t('quantity')}</span>
                <span className="col-span-2 text-right">{t('unitPrice')}</span>
                <span className="col-span-2">{t('taxes')}</span>
                <span className="col-span-2 text-right">{t('total')}</span>
                {/* La paperera anirà a la fila */}
            </div>

            {/* Fila per a mòbils (si no hi ha items) */}
            {(items || []).length === 0 && (
                <p className="text-center text-muted-foreground py-4">{t('emptyState')}</p>
            )}

            {/* Llista d'items */}
            {(items || []).map((item, index) => (
                <div key={item.id || index} className="space-y-2 md:space-y-0 md:grid md:grid-cols-12 md:gap-2 md:items-start border-b pb-2">
                    
                    {/* Descripció */}
                    <div className="md:col-span-4">
                        <Label className="md:hidden text-xs font-medium">{t('description')}</Label>
                        <Input
                            placeholder={t('placeholder.description')}
                            value={item.description}
                            onChange={(e) => onItemChange(index, 'description', e.target.value)}
                            disabled={isSaving}
                            className="h-9"
                        />
                    </div>

                    {/* Quantitat */}
                    <div className="md:col-span-2">
                        <Label className="md:hidden text-xs font-medium">{t('quantity')}</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={item.quantity || 0}
                            onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={isSaving}
                            className="text-right h-9"
                            step="any"
                        />
                    </div>

                    {/* Preu Unitari */}
                    <div className="md:col-span-2">
                        <Label className="md:hidden text-xs font-medium">{t('unitPrice')}</Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={item.unit_price || 0}
                            onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            disabled={isSaving}
                            className="text-right h-9"
                            step="0.01"
                        />
                    </div>

                    {/* ✅ NOU: Selector d'Impostos */}
                    <div className="md:col-span-2">
                        <Label className="md:hidden text-xs font-medium">{t('taxes')}</Label>
                        {isLoadingTaxes ? (
                          <Button variant="outline" className="w-full h-9" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                        ) : (
                          <ItemTaxSelector
                              availableTaxes={availableTaxes}
                              selectedTaxes={item.taxes || []} // 👈 AFEGIT GUARD '|| []'
                              onChange={(newTaxes) => onItemTaxesChange(index, newTaxes)}
                              disabled={isSaving}
                          />
                        )}
                    </div>
                    
                    {/* Total (Lectura) i Botó Esborrar */}
                    <div className="md:col-span-2">
                      <Label className="md:hidden text-xs font-medium">{t('total')}</Label>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-right flex-1 pt-2">
                            {item.total ? item.total.toFixed(2) : '0.00'}
                        </span>
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

                </div>
            ))}
        </div>
    );
}