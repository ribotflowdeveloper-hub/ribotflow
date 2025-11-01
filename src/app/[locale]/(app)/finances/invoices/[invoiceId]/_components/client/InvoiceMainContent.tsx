"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // ✅ Afegit
import {
  Plus,
  ListChecks,
  Calculator, // ✅ Afegit
} from 'lucide-react';
import { type InvoiceItem } from '@/types/finances';
import { InvoiceItemsEditor } from '../InvoiceItemsEditor';
import { ModuleCard } from '@/components/shared/ModuleCard';
import { formatCurrency } from '@/lib/utils/formatters'; // ✅ Afegit

// Importem el hook per agafar-ne els tipus
import { useInvoiceDetail } from '../../_hooks/useInvoiceDetail';

// Extraiem els tipus de retorn del hook
type UseInvoiceDetailReturn = ReturnType<typeof useInvoiceDetail>;

interface InvoiceMainContentProps {
  formData: UseInvoiceDetailReturn['formData'];
  handleFieldChange: UseInvoiceDetailReturn['handleFieldChange'];
  formIsDisabled: boolean;
  t: UseInvoiceDetailReturn['t'];
  handleAddItem: () => void;
  handleItemChange: <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => void;
  handleRemoveItem: (index: number) => void;
}

export function InvoiceMainContent({
  formData,
  handleFieldChange,
  formIsDisabled,
  t,
  handleAddItem,
  handleItemChange,
  handleRemoveItem,
}: InvoiceMainContentProps) {
  return (
    // ✅ Canvi de layout: 1 col per defecte, 4-col layout en 'lg'
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 px-4 md:px-0">

      {/* 1. LÍNIES DE FACTURA (Columna Esquerra 75%) */}
      <ModuleCard
        title={t('card.invoiceItems')}
        icon={ListChecks}
        variant="invoices"
        isCollapsible={false}
        className="lg:col-span-3" // ✅ Ocupa 3/4
        actions={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleAddItem}
            disabled={formIsDisabled}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
          >
            <Plus className="w-4 h-4 mr-2" /> {t('button.addItem')}
          </Button>
        }
      >
        <InvoiceItemsEditor
          items={formData.invoice_items || []}
          onItemChange={handleItemChange}
          onRemoveItem={handleRemoveItem}
          isSaving={formIsDisabled}
          currency={formData.currency || 'EUR'}
          locale={formData.language || 'ca'}
        />
      </ModuleCard>

      {/* 2. TOTALS (Mogut aquí des de MetaGrid) (Columna Dreta 25%) */}
      <ModuleCard
        title={t('card.totals')}
        icon={Calculator}
        variant="invoices"
        isCollapsible={false}
        className="lg:col-span-1" // ✅ Ocupa 1/4
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="discount_amount">{t('label.discount')}</Label>
            <Input
              id="discount_amount"
              type="number"
              value={formData.discount_amount ?? 0}
              onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
              className="w-24 text-right"
              step="0.01"
              min="0"
              disabled={formIsDisabled}
            />
          </div>
          <div className="flex justify-between items-center">
            <Label htmlFor="tax_rate">{t('label.taxRate')} (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              value={formData.tax_rate ?? 0}
              onChange={(e) => handleFieldChange('tax_rate', parseFloat(e.target.value) || 0)}
              className="w-20 text-right"
              step="any"
              min="0"
              disabled={formIsDisabled}
            />
          </div>
          <div className="flex justify-between items-center">
            <Label htmlFor="shipping_cost">{t('label.shipping')}</Label>
            <Input
              id="shipping_cost"
              type="number"
              value={formData.shipping_cost ?? 0}
              onChange={(e) => handleFieldChange('shipping_cost', parseFloat(e.target.value) || 0)}
              className="w-24 text-right"
              step="0.01"
              min="0"
              disabled={formIsDisabled}
            />
          </div>
          <hr className="my-3" />
          <div className="flex justify-between text-sm"><p>{t('label.subtotal')}</p><p>{formatCurrency(formData.subtotal, formData.currency, formData.language)}</p></div>
          {(formData.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground"><p>{t('label.discountApplied')}</p><p>-{formatCurrency(formData.discount_amount ?? 0, formData.currency, formData.language)}</p></div>
          )}
          <div className="flex justify-between text-sm"><p>{t('label.tax')} ({formData.tax_rate ?? 0}%)</p><p>{formatCurrency(formData.tax_amount, formData.currency, formData.language)}</p></div>
          {(formData.shipping_cost ?? 0) > 0 && (
            <div className="flex justify-between text-sm"><p>{t('label.shippingApplied')}</p><p>{formatCurrency(formData.shipping_cost ?? 0, formData.currency, formData.language)}</p></div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3"><p>{t('label.total')}</p><p>{formatCurrency(formData.total_amount, formData.currency, formData.language)}</p></div>
        </div>
      </ModuleCard>

    </div>
  );
}