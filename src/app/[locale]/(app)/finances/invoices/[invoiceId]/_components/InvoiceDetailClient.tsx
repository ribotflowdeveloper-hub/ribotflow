"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; // ✅ 1. Importem 'dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Plus, Settings2, Eye, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type InvoiceDetail, type InvoiceStatus } from '@/types/finances';
import { useInvoiceDetail } from '../_hooks/useInvoiceDetail';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { formatCurrency } from '@/lib/utils/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVOICE_STATUS_MAP } from '@/config/invoices';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { InvoicePreview } from './InvoicePreview';

// ✅ 2. Importem el botó de PDF de forma dinàmica
// Això assegura que NOMÉS es carregui al client i mai al servidor.
const InvoiceDownloadButton = dynamic(
  () => import('./InvoiceDownloadButton').then((mod) => mod.InvoiceDownloadButton),
  { 
    ssr: false, // <-- La clau és aquí
    loading: () => (
      // Mostrem un 'placeholder' mentre es carrega el component
      <Button variant="outline" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Carregant PDF...
      </Button>
    )
  }
);


interface InvoiceDetailClientProps {
  initialData: InvoiceDetail | null;
  isNew: boolean;
  title: string;
  description: string;

}

export function InvoiceDetailClient({
  initialData,
  isNew,
  title,
  description,

}: InvoiceDetailClientProps) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('from');

  const {
    formData,
    isPending, 
    isFinalizing,
    isLocked, 
    handleFieldChange,
    handleItemChange,
    handleAddItem,
    handleRemoveItem,
    handleSubmit, 
    handleFinalize,
    t,
  } = useInvoiceDetail({ initialData, isNew });

  const isSaving = isPending || isFinalizing;
  const formIsDisabled = isSaving || isLocked;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleBack = () => {
    if (fromUrl) {
      router.push(fromUrl);
    } else {
      router.push('/finances/invoices');
    }
  };


  return (
    <div className="px-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- Barra d'Accions Sticky --- */}
        <div className="flex justify-between items-center gap-4 sticky top-[--header-height] bg-background py-3 z-10 border-b mb-6 px-4 md:px-0 -mx-4 md:-mx-0 sm:-mx-6 ">
          {/* Part Esquerra */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleBack}
              aria-label={t('button.goBack')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold leading-tight">{title}</h1>
              {description && <p className="text-sm text-muted-foreground hidden md:block">{description}</p>}
            </div>
          </div>
          {/* Part Dreta */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" disabled={formIsDisabled}>
                  <Settings2 className="h-4 w-4" />
                  <span className="sr-only">{t('button.options')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('field.currency')}</Label>
                  <Input
                    id="currency"
                    value={formData.currency || 'EUR'}
                    onChange={(e) => handleFieldChange('currency', e.target.value.toUpperCase())}
                    disabled={formIsDisabled} 
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t('field.language')}</Label>
                  <Input
                    id="language"
                    value={formData.language || 'ca'}
                    onChange={(e) => handleFieldChange('language', e.target.value)}
                    disabled={formIsDisabled} 
                    maxLength={5}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('button.preview')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{t('preview.title')}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-grow py-4 pr-6 -mr-6">
                  <InvoicePreview formData={formData} />
                </ScrollArea>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">{t('button.close')}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ✅ 3. La renderització del botó no canvia */}
            {/* Només es mostra si NO és 'Draft' */}
            {formData.status !== 'Draft' && initialData && (
                <InvoiceDownloadButton invoice={initialData} />
            )}


            {/* 1. Botó "Guardar Esborrany" (type="submit") */}
            {!isLocked && (
              <Button type="submit" disabled={isSaving}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isPending ? t('button.saving') : t('button.saveDraft')}
              </Button>
            )}

            {/* 2. Botó "Emetre Factura" (type="button") */}
            {!isNew && !isLocked && (
              <Button
                type="button"
                variant="default"
                onClick={handleFinalize}
                disabled={isSaving}
              >
                {isFinalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {isFinalizing ? t('button.issuing') : t('button.issueInvoice')}
              </Button>
            )}

            {/* 3. Indicador de "Bloquejat" */}
            {isLocked && (
              <Badge variant="outline" className="text-muted-foreground border-green-500 text-green-500">
                <Lock className="w-4 h-4 mr-2" />
                {t('status.Sent')}
              </Badge>
            )}

          </div>
        </div>

        {/* --- Contingut Principal (Grid) --- */}
        {/* Tots els camps 'disabled' ara fan servir 'formIsDisabled' */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 px-4 md:px-0">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>{t('card.customerDetails')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_id">{t('field.customer')}</Label>
                  <Input
                    id="contact_id"
                    value={formData.contact_id?.toString() ?? ''}
                    onChange={(e) => handleFieldChange('contact_id', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="ID Client (Temporal - Usa Combobox)"
                    disabled={formIsDisabled} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_reference">{t('field.clientReference')}</Label>
                    <Input
                      id="client_reference"
                      value={formData.client_reference || ''}
                      onChange={(e) => handleFieldChange('client_reference', e.target.value)}
                      placeholder={t('placeholder.clientReference')}
                      disabled={formIsDisabled} 
                    />
                  </div>
                </div>
                {!isNew && initialData && (
                  <Card>
                    <CardHeader><CardTitle>{t('card.metadata')}</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>ID:</strong> {initialData.id}</p>
                      {initialData.verifactu_uuid && (
                        <>
                          <p><strong>VeriFactu ID:</strong> <span className='text-xs'>{initialData.verifactu_uuid}</span></p>
                          <p><strong>Signatura:</strong> <span className='text-xs'>{initialData.verifactu_signature?.substring(0, 20)}...</span></p>
                          <p><strong>Ant:</strong> <span className='text-xs'>{initialData.verifactu_previous_signature?.substring(0, 20) || 'N/A'}...</span></p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex-row justify-between items-center'>
                <CardTitle>{t('card.invoiceItems')}</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={handleAddItem} disabled={formIsDisabled}> 
                  <Plus className="w-4 h-4 mr-2" /> {t('button.addItem')}
                </Button>
              </CardHeader>
              <CardContent>
                <InvoiceItemsEditor
                  items={formData.invoice_items || []}
                  onItemChange={handleItemChange}
                  onRemoveItem={handleRemoveItem}
                  isSaving={formIsDisabled} 
                  currency={formData.currency || 'EUR'}
                  locale={formData.language || 'ca'}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('card.paymentTerms')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">{t('field.terms')}</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms || ''}
                    onChange={(e) => handleFieldChange('terms', e.target.value)}
                    placeholder={t('placeholder.terms')}
                    rows={3}
                    disabled={formIsDisabled} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_details">{t('field.paymentDetails')}</Label>
                  <Textarea
                    id="payment_details"
                    value={formData.payment_details || ''}
                    onChange={(e) => handleFieldChange('payment_details', e.target.value)}
                    placeholder={t('placeholder.paymentDetails')}
                    rows={3}
                    disabled={formIsDisabled} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>{t('card.invoiceMeta')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">{t('field.invoiceNumber')}</Label>
                  <Input id="invoice_number" value={formData.invoice_number || ''} disabled placeholder={t('placeholder.autoGenerated')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issue_date">{t('field.invoiceDate')}</Label>
                  <Input
                    type="date"
                    id="issue_date"
                    value={formData.issue_date || ''}
                    onChange={(e) => handleFieldChange('issue_date', e.target.value)}
                    disabled={formIsDisabled} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">{t('field.dueDate')}</Label>
                  <Input
                    type="date"
                    id="due_date"
                    value={formData.due_date || ''}
                    onChange={(e) => handleFieldChange('due_date', e.target.value)}
                    disabled={formIsDisabled} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t('field.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleFieldChange('status', v as InvoiceStatus)}
                    disabled={formIsDisabled || !isNew} 
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder={t('placeholder.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_STATUS_MAP.map(s => (
                        <SelectItem key={s.dbValue} value={s.dbValue}>
                          {t(`status.${s.key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('card.notes')}</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  disabled={formIsDisabled} 
                  rows={4}
                  placeholder={t('placeholder.notes')}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('card.totals')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}