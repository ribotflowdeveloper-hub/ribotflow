"use client";

import React from 'react';
// import Link from 'next/link'; // O Button per a 'Tornar' // No s'usa
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, /* ArrowLeft, */ Plus } from 'lucide-react'; // Icones necessàries (ArrowLeft no s'usa aquí)
import { type InvoiceDetail, type InvoiceStatus } from '@/types/finances/invoices'; // Ajusta la ruta i afegeix InvoiceStatus
import { useInvoiceDetail } from '../_hooks/useInvoiceDetail';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
// ✅ Importem el formatter que faltava
import { formatCurrency } from '@/lib/utils/formatters';
// Importa altres components necessaris (ex: Selector de Client, Data, etc.)
// import { CustomerCombobox } from '@/components/shared/CustomerCombobox';
// import { DatePicker } from '@/components/ui/datepicker';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importa Select si el vols fer servir per status
// import { INVOICE_STATUS_MAP } from '@/types/finances/invoices'; // Importa el mapa si uses Select

interface InvoiceDetailClientProps {
  initialData: InvoiceDetail | null;
  isNew: boolean;
  // clients: { id: number | string; nom: string }[];
  // products: { id: number | string; name: string; price: number }[];
}

export function InvoiceDetailClient({
  initialData,
  isNew,
  // clients,
  // products,
}: InvoiceDetailClientProps) {




  const {
    formData,
    isPending,
    handleFieldChange,
    handleItemChange,
    handleAddItem,
    handleRemoveItem,
    handleSubmit,
    t,
  } = useInvoiceDetail({ initialData, isNew /*, clients, products */ });

  const isSaving = isPending;
  // const pageTitle = isNew // No es fa servir, el títol ve del PageHeader a InvoiceDetailData
  //   ? t('title.new')
  //   : formData.invoice_number || `${t('title.invoice')} #${initialData?.id}`;

  // Lògica del botó 'Tornar' (ara gestionada pel PageHeader, no cal aquí)
  // const handleBack = () => { ... };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Capçalera simplificada (el PageHeader ja és a InvoiceDetailData) */}
      <div className="flex justify-end items-center gap-3 sticky top-[--header-height] bg-background py-4 z-10 border-b -mt-6 mb-6 px-4 md:px-0">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isSaving ? t('button.saving') : t('button.save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">

        {/* Columna Esquerra */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('card.customerDetails')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_id">{t('field.customer')}</Label>
                {/* Aquí aniria el CustomerCombobox real */}
                <Input
                  id="contact_id"
                  value={formData.contact_id?.toString() ?? ''}
                  onChange={(e) => handleFieldChange('contact_id', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="ID Client (Temporal)"
                  disabled={isSaving}
                 />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex-row justify-between items-center'>
                <CardTitle>{t('card.invoiceItems')}</CardTitle>
                 <Button type="button" size="sm" variant="outline" onClick={handleAddItem} disabled={isSaving}>
                   <Plus className="w-4 h-4 mr-2" /> {t('button.addItem')}
                 </Button>
             </CardHeader>
            <CardContent>
              <InvoiceItemsEditor
                items={formData.invoice_items || []}
                onItemChange={handleItemChange}
                onRemoveItem={handleRemoveItem}
                isSaving={isSaving}
                // products={products}
                currency="EUR" // TODO: Fer dinàmic
                locale="ca" // TODO: Obtenir de context/params
              />
            </CardContent>
          </Card>
        </div>

        {/* Columna Dreta */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>{t('card.invoiceMeta')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="invoice_number">{t('field.invoiceNumber')}</Label>
                    <Input id="invoice_number" value={formData.invoice_number || ''} disabled placeholder={t('placeholder.autoGenerated')} />
                </div>
                {/* Data Factura */}
                <div className="space-y-2">
                  <Label htmlFor="issue_date">{t('field.invoiceDate')}</Label>
                  <Input
                    type="date"
                    id="issue_date" // ID ha de coincidir amb el htmlFor
                    value={formData.issue_date || ''}
                    // ✅ Corregit: 'issue_date'
                    onChange={(e)=>handleFieldChange('issue_date', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                 {/* Data Venciment */}
                <div className="space-y-2">
                  <Label htmlFor="due_date">{t('field.dueDate')}</Label>
                   <Input
                    type="date"
                    id="due_date"
                    value={formData.due_date || ''}
                    onChange={(e)=>handleFieldChange('due_date', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                {/* Estat */}
                <div className="space-y-2">
                 <Label htmlFor="status">{t('field.status')}</Label>
                 {/* Recomanat usar Select aquí */}
                  <Input
                    id="status"
                    value={formData.status || ''}
                    // ✅ Corregit: Cast a InvoiceStatus
                    onChange={(e)=>handleFieldChange('status', e.target.value as InvoiceStatus)}
                    disabled={isSaving}
                  />
                  {/* Alternativa amb Select:
                  <Select value={formData.status} onValueChange={(v) => handleFieldChange('status', v as InvoiceStatus)} disabled={isSaving}>
                     <SelectTrigger id="status">
                       <SelectValue placeholder={t('placeholder.selectStatus')} />
                     </SelectTrigger>
                     <SelectContent>
                       {INVOICE_STATUS_MAP.map(s => (
                         <SelectItem key={s.dbValue} value={s.dbValue}>
                           {t(`status.${s.key}`)} // Necessites traduccions per a cada clau
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   */}
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
                       disabled={isSaving}
                       rows={4}
                       placeholder={t('placeholder.notes')}
                   />
               </CardContent>
           </Card>

            <Card>
              <CardHeader><CardTitle>{t('card.totals')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                  {/* ✅ Corregit: formatCurrency ja està disponible */}
                  <div className="flex justify-between"><Label>{t('label.subtotal')}</Label><span>{formatCurrency(formData.subtotal)}</span></div>
                  {/* TODO: Afegir descompte i taxa si cal */}
                  <div className="flex justify-between"><Label>{t('label.tax')} ({formData.tax_rate}%)</Label><span>{formatCurrency(formData.tax_amount)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><Label>{t('label.total')}</Label><span>{formatCurrency(formData.total_amount)}</span></div>
              </CardContent>
            </Card>

            {!isNew && initialData && (
                 <Card>
                     <CardHeader><CardTitle>{t('card.metadata')}</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                          <p><strong>ID:</strong> {initialData.id}</p>
                          {/* Afegeix més metadades */}
                      </CardContent>
                  </Card>
             )}
        </div>
      </div>
    </form>
  );
}