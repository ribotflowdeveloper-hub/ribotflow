"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  ListChecks,
  Calculator,
  BookPlus,
} from 'lucide-react';
import { ProductSelector } from '@/components/shared/ProductSelector';
import { 
    type InvoiceItem, 
    type TaxRate // ✅ Importem TaxRate
} from '@/types/finances/index';
import { type Database } from '@/types/supabase';
type Product = Database['public']['Tables']['products']['Row'];

import { InvoiceItemsEditor } from '../InvoiceItemsEditor'; // ✅ Importem el nou editor
import { ModuleCard } from '@/components/shared/ModuleCard';
import { formatCurrency } from '@/lib/utils/formatters';
import { useInvoiceDetail } from '../../_hooks/useInvoiceDetail';

type UseInvoiceDetailReturn = ReturnType<typeof useInvoiceDetail>;

interface InvoiceMainContentProps {
  formData: UseInvoiceDetailReturn['formData'];
  handleFieldChange: UseInvoiceDetailReturn['handleFieldChange'];
  formIsDisabled: boolean;
  t: UseInvoiceDetailReturn['t'];
  products: Product[]; 
  handleAddItem: () => void;
  handleAddProductFromLibrary: (product: Product) => void; 
  handleItemChange: <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => void;
  handleRemoveItem: (index: number) => void;
  
  // ✅ 1. AFEGIM LES NOVES PROPS PER ALS IMPOSTOS
  availableTaxes: TaxRate[];
  isLoadingTaxes: boolean;
  handleItemTaxesChange: (index: number, taxes: TaxRate[]) => void;
}

export function InvoiceMainContent({
  formData,
  handleFieldChange,
  formIsDisabled,
  t,
  products,
  handleAddItem,
  handleAddProductFromLibrary,
  handleItemChange,
  handleRemoveItem,
  // ✅ 2. Rebem les noves props
  availableTaxes,
  isLoadingTaxes,
  handleItemTaxesChange,
}: InvoiceMainContentProps) {

  const t_selector = (key: string) => t(`productSelector.${key}`);
  const locale = formData.language || 'ca';
  const currency = formData.currency || 'EUR';

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
          <ProductSelector
            products={products}
            onProductSelect={handleAddProductFromLibrary}
            onManualAdd={handleAddItem}
            t={t_selector}
            // ✅ 3. CORRECCIÓ: 'ProductSelector' espera 'disabled'
            // (L'error que et sortia abans)
            disabled={formIsDisabled} 
            triggerButton={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={formIsDisabled}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              >
                <BookPlus className="w-4 h-4 mr-2" /> {t('button.addFromLibrary')}
              </Button>
            }
          />
        }
      >
        {/* ✅ 4. Passem les noves props a l'editor */}
        <InvoiceItemsEditor
          items={formData.invoice_items || []}
          availableTaxes={availableTaxes}
          isLoadingTaxes={isLoadingTaxes}
          onItemChange={handleItemChange}
          onItemTaxesChange={handleItemTaxesChange}
          onRemoveItem={handleRemoveItem}
          isSaving={formIsDisabled}
          currency={currency}
          locale={locale}
        />
      </ModuleCard>

      {/* 2. TOTALS */}
      <ModuleCard
        title={t('card.totals')}
        icon={Calculator}
        variant="invoices"
        isCollapsible={false}
        className="lg:col-span-1"
      >
        {/* ✅ 5. TARGETA DE TOTALS (ACTUALITZADA) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <Label>{t('label.subtotal')}</Label>
            <span className="font-medium">{formatCurrency(formData.subtotal, currency, locale)}</span>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="discount_amount">{t('label.discount')}</Label>
            <Input
              id="discount_amount"
              type="number"
              value={formData.discount_amount === 0 ? '' : formData.discount_amount || ''}
              placeholder="0.00"
              onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
              className="w-full text-right"
              step="0.01"
              min="0"
              disabled={formIsDisabled}
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <Label>{t('label.tax') || 'Impostos (IVA)'}</Label>
            <span className="font-medium">
              {formatCurrency(formData.tax_amount, currency, locale)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <Label>{t('label.retention') || 'Retencions (IRPF)'}</Label>
            <span className="font-medium text-red-600">
              -{formatCurrency(formData.retention_amount, currency, locale)}
            </span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="shipping_cost">{t('label.shipping')}</Label>
            <Input
              id="shipping_cost"
              type="number"
              value={formData.shipping_cost === 0 ? '' : formData.shipping_cost || ''}
              placeholder="0.00"
              onChange={(e) => handleFieldChange('shipping_cost', parseFloat(e.target.value) || 0)}
              className="w-full text-right"
              step="0.01"
              min="0"
              disabled={formIsDisabled}
            />
          </div>
          <hr className="my-3" />
          
          <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3">
            <p>{t('label.total')}</p>
            <p>{formatCurrency(formData.total_amount, currency, locale)}</p>
          </div>
        </div>
      </ModuleCard>

    </div>
  );
}