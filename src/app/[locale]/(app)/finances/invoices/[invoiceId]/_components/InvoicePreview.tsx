"use client";

import React from 'react';
import Image from 'next/image'; // ✅ 1. Importa Image
import { useTranslations } from 'next-intl';
import { type InvoiceFormData } from '@/types/finances/invoices';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface InvoicePreviewProps {
    formData: InvoiceFormData;
    companyProfile?: {
        name: string | null;
        tax_id: string | null;
        address: string | null;
        email: string | null;
        logo_url?: string | null;
    } | null;
}

export function InvoicePreview({ formData, companyProfile }: InvoicePreviewProps) {
    const t = useTranslations('InvoiceDetailPage');

    const company = companyProfile ?? {
        name: formData.company_name,
        tax_id: formData.company_tax_id,
        address: formData.company_address,
        email: formData.company_email,
        logo_url: formData.company_logo_url,
    };

    const client = {
        name: formData.client_name,
        tax_id: formData.client_tax_id,
        address: formData.client_address,
        email: formData.client_email,
    };

    const currency = formData.currency || 'EUR';
    const locale = formData.language || 'ca';

    return (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-4xl mx-auto border print:shadow-none print:border-none text-sm">
            {/* Capçalera */}
            <header className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                {/* Dades Empresa */}
                <div className="flex-1">
                    {company.logo_url && (
                        // ✅ 2. Substitueix img per Image i afegeix width/height
                        <Image
                            src={company.logo_url}
                            alt="Logo Empresa"
                            width={150} // 👈 3. Afegeix ample (ajusta segons necessitis)
                            height={64} // 👈 3. Afegeix alçada (ajusta per mantenir relació aspecte)
                            className="h-12 sm:h-16 w-auto mb-3 object-contain" // Manté alçada visual i evita deformació
                        />
                    )}
                    <h1 className="text-xl sm:text-2xl font-bold mb-1">{company.name || t('preview.defaultCompanyName')}</h1>
                    {company.address && <p className="text-xs text-gray-600 whitespace-pre-line">{company.address}</p>}
                    {company.tax_id && <p className="text-xs text-gray-600">NIF: {company.tax_id}</p>}
                    {company.email && <p className="text-xs text-gray-600">{company.email}</p>}
                </div>
                {/* ... resta del component ... */}
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
            <section className="mb-6">
                <Table>
                    <TableHeader className="bg-gray-50 text-xs uppercase">
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
                        {(formData.invoice_items || []).map((item, index) => {
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
                             const lineTotalAfterDiscount = lineTotalBeforeDiscount - lineDiscountAmount;

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
                    {(formData.discount_amount ?? 0) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">{t('label.discountApplied')}:</span>
                            <span className="font-medium text-right">-{formatCurrency(formData.discount_amount ?? 0, currency, locale)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-600">{t('label.tax')} ({formData.tax_rate ?? 0}%):</span>
                        <span className="font-medium text-right">{formatCurrency(formData.tax_amount, currency, locale)}</span>
                    </div>
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