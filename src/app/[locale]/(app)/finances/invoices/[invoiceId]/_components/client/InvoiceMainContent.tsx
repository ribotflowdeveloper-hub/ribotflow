// /app/[locale]/(app)/finances/invoices/[id]/_components/InvoiceMainContent.tsx (MODIFICAT)
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  // Plus, // Ja no s'usa
  ListChecks,
  Calculator,
  BookPlus, // ✅ Importem la icona pel nou botó
} from 'lucide-react';

// ✅ Importem el component reutilitzable
import { ProductSelector } from '@/components/shared/ProductSelector';

// ✅ Importem els tipus necessaris
import { type InvoiceItem } from '@/types/finances';
import { type Database } from '@/types/supabase';
type Product = Database['public']['Tables']['products']['Row'];

import { InvoiceItemsEditor } from '../InvoiceItemsEditor';
import { ModuleCard } from '@/components/shared/ModuleCard';
import { formatCurrency } from '@/lib/utils/formatters';

// Importem el hook per agafar-ne els tipus
import { useInvoiceDetail } from '../../_hooks/useInvoiceDetail';
type UseInvoiceDetailReturn = ReturnType<typeof useInvoiceDetail>;

interface InvoiceMainContentProps {
  formData: UseInvoiceDetailReturn['formData'];
  handleFieldChange: UseInvoiceDetailReturn['handleFieldChange'];
  formIsDisabled: boolean;
  t: UseInvoiceDetailReturn['t'];
  products: Product[]; // ✅ Hem d'afegir els productes

  // Handlers d'items
  handleAddItem: () => void; // Aquest és per 'onManualAdd'
  handleAddProductFromLibrary: (product: Product) => void; // ✅ Nou handler
  handleItemChange: <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => void;
  handleRemoveItem: (index: number) => void;
}

export function InvoiceMainContent({
  formData,
  handleFieldChange,
  formIsDisabled,
  t,
  products, // ✅ Rebem els productes
  handleAddItem,
  handleAddProductFromLibrary, // ✅ Rebem el nou handler
  handleItemChange,
  handleRemoveItem,
}: InvoiceMainContentProps) {

  // ✅ Definim les traduccions per al selector.
  // Assegura't que tens un objecte "productSelector" al teu JSON de "InvoiceDetailPage"
  // Ex: "InvoiceDetailPage.productSelector.addButton"
  const t_selector = (key: string) => t(`productSelector.${key}`);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 px-4 md:px-0">

      {/* 1. LÍNIES DE FACTURA */}
      <ModuleCard
        title={t('card.invoiceItems')}
        icon={ListChecks}
        variant="invoices"
        isCollapsible={false}
        className="lg:col-span-3"
        actions={
          // ✅ Substituïm el botó antic pel 'ProductSelector'
          <ProductSelector
            products={products}
            onProductSelect={handleAddProductFromLibrary}
            onManualAdd={handleAddItem}
            t={t_selector}
            // Personalitzem el trigger per al header del ModuleCard
            triggerButton={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={formIsDisabled}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              >
                {/* ✅ Usem la icona 'BookPlus' i un text adequat */}
                <BookPlus className="w-4 h-4 mr-2" /> {t('button.addFromLibrary')}
              </Button>
            }
          />
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

      {/* 2. TOTALS (Sense canvis) */}
      <ModuleCard
        title={t('card.totals')}
        icon={Calculator}
        variant="invoices"
        isCollapsible={false}
        className="lg:col-span-1"
      >
        <div className="space-y-3">
          {/* ... (Contingut de la targeta de totals idèntic) ... */}
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