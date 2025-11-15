"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import { 
  type InvoiceItem,
  type TaxRate 
} from '@/types/finances/index';
import { useTranslations } from 'next-intl';
// ✅ 1. Importem el selector d'impostos. 
// Assegura't que la ruta és correcta (l'hem creat dins de 'expenses' però és genèric)
import { ItemTaxSelector } from '../../../../../../../components/features/taxs/ItemTaxSelector'; 
import { formatCurrency } from '@/lib/utils/formatters';

// ✅ 2. AQUESTA ÉS LA INTERFÍCIE DE PROPS CORRECTA
interface InvoiceItemsEditorProps {
    items: InvoiceItem[];
    availableTaxes: TaxRate[];
    isLoadingTaxes: boolean;
    onItemChange: (index: number, field: keyof InvoiceItem, value: string | number) => void;
    onItemTaxesChange: (index: number, taxes: TaxRate[]) => void;
    onRemoveItem: (index: number) => void;
    isSaving: boolean;
    currency?: string;
    locale?: string;
}

export function InvoiceItemsEditor({
    items,
    availableTaxes,
    isLoadingTaxes,
    onItemChange,
    onItemTaxesChange,
    onRemoveItem,
    isSaving,
    currency = 'EUR',
    locale = 'ca',
}: InvoiceItemsEditorProps) {

    const t = useTranslations('InvoiceDetailPage.items');

    return (
        <div className="space-y-4">
            {/* Capçalera de la taula (per a 'md' i més grans) */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <span className="col-span-4">{t('description')}</span>
                <span className="col-span-1 text-right">{t('quantity')}</span>
                <span className="col-span-2 text-right">{t('unitPrice')}</span>
                <span className="col-span-3">{t('taxes')}</span>
                <span className="col-span-2 text-right">{t('total')}</span>
            </div>

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
                    <div className="md:col-span-1">
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

                    {/* ✅ 3. Selector d'Impostos */}
                    <div className="md:col-span-3">
                        <Label className="md:hidden text-xs font-medium">{t('taxes')}</Label>
                        {isLoadingTaxes ? (
                          <Button variant="outline" className="w-full h-9" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                        ) : (
                          <ItemTaxSelector
                              availableTaxes={availableTaxes}
                              selectedTaxes={item.taxes || []} 
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
                            {formatCurrency(item.total, currency, locale)}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveItem(index)}
                            disabled={isSaving}
                            className="w-8 h-8 text-red-500 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </div>
            ))}
        </div>
    );
}