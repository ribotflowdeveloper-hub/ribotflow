// src/app/[locale]/(app)/finances/invoices/[invoiceId]/_components/InvoicePreview.tsx (FITXER CORREGIT)

"use client";

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
// ✅ 1. Aquest tipus és el que acabes de modificar. Ara és la font del "problema".
import { type InvoiceFormData } from '@/types/finances/invoices'; 
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';

// Definim el tipus Contact basat en la taula de Supabase
type Contact = Database['public']['Tables']['contacts']['Row'];

interface InvoicePreviewProps {
    formData: InvoiceFormData; // <-- Aquest tipus ara no té 'tax_rate'
    companyProfile?: CompanyProfile | null;
    clientProfile?: Contact | null;
}

export function InvoicePreview({ formData, companyProfile, clientProfile }: InvoicePreviewProps) {
    const t = useTranslations('InvoiceDetailPage');

    // LÒGICA DE MAPPEIG (Companyia)
    const company = {
        name: formData.company_name,
        tax_id:  formData.company_tax_id,
        address: companyProfile
            ? [ companyProfile.company_address].filter(Boolean).join('\n')
            : formData.company_address,
        email:  formData.company_email,
        logo_url: companyProfile?.logo_url ?? formData.company_logo_url,
    };

    // LÒGICA DE MAPPEIG (Client)
    const client = {
        name: clientProfile?.nom ?? formData.client_name, 
        tax_id: clientProfile?.tax_id ?? formData.client_tax_id,
        address: clientProfile
            ? [clientProfile.street, clientProfile.city, clientProfile.postal_code, clientProfile.country].filter(Boolean).join('\n')
            : formData.client_address,
        email: clientProfile?.email ?? formData.client_email,
    };

    const currency = formData.currency || 'EUR';
    const locale = formData.language || 'ca';

    return (
        <div className="bg-white text-gray-900 p-6 sm:p-8 rounded-lg shadow-lg max-w-4xl mx-auto border print:shadow-none print:border-none text-sm">
            {/* Capçalera */}
            <header className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                {/* Dades Empresa */}
                <div className="flex-1">
                    {company.logo_url && (
                        <Image
                            src={company.logo_url}
                            alt="Logo Empresa"
                            width={150}
                            height={64}
                            className="h-12 sm:h-16 w-auto mb-3 object-contain"
                        />
                    )}
                    <h1 className="text-xl sm:text-2xl font-bold mb-1">{company.name || t('preview.defaultCompanyName')}</h1>
                    {company.address && <p className="text-xs text-gray-600 whitespace-pre-line">{company.address}</p>}
                    {company.tax_id && <p className="text-xs text-gray-600">NIF: {company.tax_id}</p>}
                    {company.email && <p className="text-xs text-gray-600">{company.email}</p>}
                </div>

                {/* Dades Factura */}
                <div className="text-left sm:text-right w-full sm:w-auto mt-4 sm:mt-0">
                    <h2 className="text-2xl sm:text-3xl font-bold uppercase text-gray-700 mb-2">{t('preview.invoiceTitle')}</h2>
                    <p><strong className="font-semibold">{t('field.invoiceNumber')}:</strong> {formData.invoice_number || t('preview.pending')}</p>
                    <p><strong className="font-semibold">{t('field.invoiceDate')}:</strong> {formData.issue_date ? formatDate(new Date(formData.issue_date), locale) : ''}</p>
                    <p><strong className="font-semibold">{t('field.dueDate')}:</strong> {formData.due_date ? formatDate(new Date(formData.due_date), locale) : t('preview.notApplicable')}</p>
                    <p><strong className="font-semibold">{t('field.status')}:</strong> {t(`status.${formData.status.toLowerCase()}`)}</p>
                </div>
            </header>

            <Separator className="my-4" />

            {/* Dades del Client */}
            <section className="mb-6">
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">{t('preview.billTo')}</h3>
                <p className="font-semibold">{client.name || t('preview.noClient')}</p>
                {client.address && <p className="text-xs text-gray-600 whitespace-pre-line">{client.address}</p>}
                {client.tax_id && <p className="text-xs text-gray-600">NIF: {client.tax_id}</p>}
                {client.email && <p className="text-xs text-gray-600">{client.email}</p>}
            </section>

            {/* Taula de Línies */}
            {/* ⚠️ IMPORTANT: Aquesta secció assumeix que 'invoice_items' té el format antic.
                 Si 'invoice_items' ja té el nou format 'taxes: TaxRate[]', 
                 el càlcul de 'lineTotalAfterDiscount' i els descomptes haurà de canviar.
                 De moment, ho deixo com estava, assumint que el 'formData' que arriba
                 encara té els càlculs fets al hook.
            */}
            <section className="mb-6">
                <Table>
                    <TableHeader className="bg-gray-50 text-xs uppercase text-gray-600">
                        <TableRow>
                            <TableHead className="w-[50%] px-2 py-2">{t('preview.itemDescription')}</TableHead>
                            <TableHead className="text-right px-2 py-2">{t('preview.itemQuantity')}</TableHead>
                            <TableHead className="text-right px-2 py-2">{t('preview.itemUnitPrice')}</TableHead>
                            {formData.invoice_items?.some(it => (it.discount_percentage ?? 0) > 0 || (it.discount_amount ?? 0) > 0) && (
                                <TableHead className="text-right px-2 py-2">{t('preview.itemDiscount')}</TableHead>
                            )}
                            <TableHead className="text-right px-2 py-2">{t('preview.itemTotal')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="text-sm">
                        {(formData.invoice_items || []).map((item: InvoiceFormData['invoice_items'][number], index: number) => {
                            // Aquests càlculs són per a la *visualització* de la línia.
                            // El 'total' de la línia a 'InvoiceItem' ja hauria d'estar calculat pel hook.
                            const quantity = Number(item.quantity) || 0;
                            const unitPrice = Number(item.unit_price) || 0;
                            const lineTotalBeforeDiscount = quantity * unitPrice;
                            
                            let lineDiscountDisplay = "-";
                            let lineDiscountAmount = 0;
                            const discountAmount = Number(item.discount_amount) || 0;
                            const discountPercentage = Number(item.discount_percentage) || 0;

                            if (discountAmount > 0) {
                                lineDiscountAmount = discountAmount;
                                lineDiscountDisplay = formatCurrency(lineDiscountAmount, currency, locale);
                            } else if (discountPercentage > 0) {
                                lineDiscountAmount = lineTotalBeforeDiscount * (discountPercentage / 100);
                                lineDiscountDisplay = `${discountPercentage}%`;
                            }
                            
                            // El total de la línia (item.total) que ve a 'InvoiceItem' 
                            // hauria de ser el total *abans* d'impostos, però *després* de descomptes de línia.
                            // Si 'item.total' al teu 'InvoiceItem' no és això, caldrà ajustar-ho.
                            // Assumim que 'item.total' és el total de la línia (preu * quantitat - descompte línia)
                            const lineTotalAfterDiscount = item.total; // Utilitzem el total calculat al hook

                            return (
                                <TableRow key={item.id ?? index} className="border-b">
                                    <TableCell className="font-medium py-1.5 px-2">{item.description || '(Sense descripció)'}</TableCell>
                                    <TableCell className="text-right py-1.5 px-2">{quantity}</TableCell>
                                    <TableCell className="text-right py-1.5 px-2">{formatCurrency(unitPrice, currency, locale)}</TableCell>
                                    {formData.invoice_items?.some(it => (it.discount_percentage ?? 0) > 0 || (it.discount_amount ?? 0) > 0) && (
                                        <TableCell className="text-right py-1.5 px-2 text-muted-foreground">{lineDiscountDisplay}</TableCell>
                                    )}
                                    <TableCell className="text-right py-1.5 px-2">{formatCurrency(lineTotalAfterDiscount, currency, locale)}</TableCell>
                                </TableRow>
                            );
                        })}
                        {formData.invoice_items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={formData.invoice_items?.some(it => (it.discount_percentage ?? 0) > 0 || (it.discount_amount ?? 0) > 0) ? 5 : 4} className="text-center text-gray-500 py-4">{t('preview.noItems')}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </section>

            {/* Totals i Peu */}
            <section className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6">
                <div className="flex-1 text-xs text-gray-600 space-y-3">
                    {formData.terms && (
                        <div>
                            <h4 className="font-semibold mb-1 uppercase text-gray-500">{t('field.terms')}:</h4>
                            <p className="whitespace-pre-line">{formData.terms}</p>
                        </div>
                    )}
                    {formData.payment_details && (
                        <div>
                            <h4 className="font-semibold mb-1 uppercase text-gray-500">{t('field.paymentDetails')}:</h4>
                            <p className="whitespace-pre-line">{formData.payment_details}</p>
                        </div>
                    )}
                </div>
                
                <div className="w-full sm:w-auto sm:max-w-xs space-y-1 text-sm self-end">
                    <div className="flex justify-between">
                        <span className="text-gray-600">{t('label.subtotal')}:</span>
                        <span className="font-medium text-right">{formatCurrency(formData.subtotal, currency, locale)}</span>
                    </div>
                    
                    {/* Descompte General */}
                    {(formData.discount_amount ?? 0) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">{t('label.discountApplied')}:</span>
                            <span className="font-medium text-right">-{formatCurrency(formData.discount_amount ?? 0, currency, locale)}</span>
                        </div>
                    )}

                    {/* ✅ 2. CANVI: Mostrar Total IVA (tax_amount) si n'hi ha */}
                    {/* Ja no mostrem 'tax_rate' perquè no existeix al tipus 'InvoiceFormData' */}
                    {(formData.tax_amount ?? 0) > 0 && (
                      <div className="flex justify-between">
                          {/* Potser necessites una nova clau de traducció, com 'label.totalVat' o 'label.totalTax' */}
                          <span className="text-gray-600">{t('label.totalTax', { default: "Total Impostos" })}:</span>
                          <span className="font-medium text-right">{formatCurrency(formData.tax_amount, currency, locale)}</span>
                      </div>
                    )}

                    {/* ✅ 3. CANVI: Mostrar Total Retenció (retention_amount) si n'hi ha */}
                    {(formData.retention_amount ?? 0) > 0 && (
                      <div className="flex justify-between">
                          <span className="text-gray-600">{t('label.totalRetention', { default: "Total Retencions" })}:</span>
                          {/* Les retencions es mostren en negatiu */}
                          <span className="font-medium text-right">-{formatCurrency(formData.retention_amount, currency, locale)}</span>
                      </div>
                    )}

                    {/* Cost d'enviament */}
                    {(formData.shipping_cost ?? 0) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">{t('label.shippingApplied')}:</span>
                            <span className="font-medium text-right">{formatCurrency(formData.shipping_cost ?? 0, currency, locale)}</span>
                        </div>
                    )}
                    
                    <Separator className="my-1.5" />
                                
                    <div className="flex justify-between font-bold text-base">
                        <span>{t('label.total')}:</span>
                        <span className="text-right">{formatCurrency(formData.total_amount, currency, locale)}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}