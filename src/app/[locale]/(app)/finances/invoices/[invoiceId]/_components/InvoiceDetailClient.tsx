"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// ❌ Eliminades importacions de Card, CardContent, CardHeader, CardTitle
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, Save, Plus, Settings2, Eye, ArrowLeft, Lock, CheckCircle,
  ListChecks, // ✅ Icona per Línies
  Banknote, // ✅ Icona per Termes
  Calculator, // ✅ Icona per Totals
  FileText, // ✅ Icona per Metadata
  User, // ✅ Icona per Client
  NotebookText, // ✅ Icona per Notes
  ShieldCheck // ✅ Icona per VeriFactu
} from 'lucide-react';
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
import { type CompanyProfile } from '@/types/settings/team'
import { type Contact } from '@/types/crm/contacts'
import { InvoiceDownloadButton } from './PDF/InvoiceDownloadButton';
import { ModuleCard } from '@/components/shared/ModuleCard'; // ✅ IMPORTEM EL NOU COMPONENT

interface InvoiceDetailClientProps {
  initialData: InvoiceDetail | null;
  company: CompanyProfile | null
  contact: Contact | null
  isNew: boolean;
  title: string;
  description: string;
}

export function InvoiceDetailClient({
  initialData,
  company,
  contact,
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
        {/* --- Barra d'Accions Sticky (Sense canvis) --- */}
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
          {/* Part Dreta (Sense canvis) */}
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

            {formData.status !== 'Draft' && initialData && company && (
              <InvoiceDownloadButton
                invoice={initialData}
                company={company}
                contact={contact}
              />)}

            {!isLocked && (
              <Button type="submit" disabled={isSaving}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isPending ? t('button.saving') : t('button.saveDraft')}
              </Button>
            )}

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

            {isLocked && (
              <Badge variant="outline" className="text-muted-foreground border-green-500 text-green-500">
                <Lock className="w-4 h-4 mr-2" />
                {t('status.Sent')}
              </Badge>
            )}
          </div>
        </div>

        {/* --- 💡 AQUÍ COMENÇA LA REESTRUCTURACIÓ DEL GRID AMB MODULECARD 💡 --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 px-4 md:px-0">
        
          {/* --- COLUMNA ESQUERRA (PRINCIPAL) --- */}
          <div className="md:col-span-2 space-y-6">
            
            {/* 1. LÍNIES DE FACTURA */}
            <ModuleCard
              title={t('card.invoiceItems')}
              icon={ListChecks}
              variant="invoices"
              defaultOpen={true}
              actions={
                <Button 
                  type="button" 
                  size="sm" 
                  variant="ghost" // Estil adaptat a la capçalera
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

            {/* 2. TERMES I PAGAMENT */}
            <ModuleCard
              title={t('card.paymentTerms')}
              icon={Banknote}
              variant="invoices"
              defaultOpen={true}
            >
              <div className="space-y-4">
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
              </div>
            </ModuleCard>

          </div>

          {/* --- COLUMNA DRETA (SIDEBAR) --- */}
          <div className="md:col-span-1 space-y-6">

            {/* 1. TOTALS */}
            <ModuleCard
              title={t('card.totals')}
              icon={Calculator}
              variant="invoices"
              defaultOpen={true}
              isCollapsible={false} // Aquesta targeta no es pot col·lapsar
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

            {/* 2. METADADES FACTURA */}
            <ModuleCard
              title={t('card.invoiceMeta')}
              icon={FileText}
              variant="invoices"
              defaultOpen={true}
            >
              <div className="space-y-4">
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
              </div>
            </ModuleCard>

            {/* 3. DETALLS DEL CLIENT */}
            <ModuleCard
              title={t('card.customerDetails')}
              icon={User}
              variant="invoices"
              defaultOpen={true}
            >
              <div className="space-y-4">
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
              </div>
            </ModuleCard>

            {/* 4. NOTES */}
            <ModuleCard
              title={t('card.notes')}
              icon={NotebookText}
              variant="invoices"
              defaultOpen={false} // Ideal per estar tancat per defecte
            >
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                disabled={formIsDisabled}
                rows={4}
                placeholder={t('placeholder.notes')}
              />
            </ModuleCard>
            
            {/* 5. METADADES VERIFACTU */}
            <ModuleCard
              title={t('card.metadata')}
              icon={ShieldCheck}
              variant="invoices"
              defaultOpen={false} // Ideal per estar tancat per defecte
              // ✅ Lògica de visibilitat moguda aquí
              isVisible={!isNew && !!initialData?.verifactu_uuid}
            >
              <div className="space-y-2 text-sm text-muted-foreground break-all">
                <p><strong>ID:</strong> {initialData?.id}</p>
                {initialData?.verifactu_uuid && (
                  <>
                    <p><strong>VeriFactu ID:</strong> <span className='text-xs'>{initialData.verifactu_uuid}</span></p>
                    <p><strong>Signatura:</strong> <span className='text-xs'>{initialData.verifactu_signature}</span></p>
                    <p><strong>Ant:</strong> <span className='text-xs'>{initialData.verifactu_previous_signature || 'N/A'}</span></p>
                  </>
                )}
              </div>
            </ModuleCard>
            
          </div>

        </div>
      </form>
    </div>
  );
}