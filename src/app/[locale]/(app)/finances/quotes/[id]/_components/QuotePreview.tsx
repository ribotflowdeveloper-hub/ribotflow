"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { type Database } from '@/types/supabase';
// Importem el tipus global per accedir a les taxes dels items
import { type EditableQuote } from '@/types/finances/quotes';
import { formatCurrency } from '@/lib/utils/formatters';
import { calculateLineTotal } from "../_hooks/quoteCalculations"; // Importem el helper

type Contact = Database['public']['Tables']['contacts']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface QuotePreviewProps {
    quote: EditableQuote;
    contacts: Contact[];
    companyProfile: Team | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    taxBreakdown?: Record<string, number>;
}

export const QuotePreview = ({
    quote,
    contacts,
    companyProfile,
    subtotal,
    discount_amount,
    tax_amount,
    total_amount,
    taxBreakdown = {}
}: QuotePreviewProps) => {
    const contact = contacts.find(c => c.id === quote.contact_id);
    const base = subtotal - discount_amount;
    const t = useTranslations('QuoteEditor');



    return (
        <aside className="hidden lg:block glass-card overflow-y-auto h-full">
            <div id="quote-preview-for-pdf">
                <div className="bg-white text-gray-900 px-8 py-8 font-sans text-sm shadow-sm min-h-[800px]">

                    {/* HEADER */}
                    <header className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-6">
                        {companyProfile?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={companyProfile.logo_url}
                                alt="Logo"
                                style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'contain' }}
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className="h-16 w-32 flex items-center justify-center bg-gray-50 text-gray-400 text-xs rounded border border-gray-200">
                                {t('preview.logoPlaceholder')}
                            </div>
                        )}
                        <div className="text-right">
                            <h1 className="font-bold text-xl text-gray-900 mb-1">{companyProfile?.name || t('preview.yourCompany')}</h1>
                            <p className="text-gray-500 text-sm"># {quote.quote_number || t('preview.pending')}</p>
                        </div>
                    </header>

                    {/* INFO GRID */}
                    <section className="grid grid-cols-2 gap-12 mb-8">
                        <div>
                            <p className="text-gray-700 font-medium">{companyProfile?.name}</p>
                            <p className="text-gray-600">{companyProfile?.address}</p>
                            <p className="text-gray-600">{companyProfile?.tax_id}</p>
                            <p className="text-gray-600">{companyProfile?.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-700 font-medium">{contact?.nom || t('preview.unselectedClient')}</p>
                            <p className="text-gray-600">{contact?.empresa}</p>
                            <p className="text-gray-600">{contact?.email}</p>
                        </div>
                    </section>

                    {/* DATES */}
                    <section className="grid grid-cols-2 gap-12 mb-8 pb-6 border-b border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t('preview.issueDate')}</p>
                            <p className="font-medium">
                                {quote.issue_date
                                    ? new Date(quote.issue_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' })
                                    : ''}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t('preview.expiryDate')}</p>
                            <p className="font-medium">
                                {quote.expiry_date
                                    ? new Date(quote.expiry_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' })
                                    : 'N/A'}
                            </p>
                        </div>
                    </section>

                    {/* ---------------- TAULA D'ITEMS ---------------- */}
                    <section className="mb-8">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="py-2 text-left font-bold text-xs uppercase text-gray-500 w-[40%]">
                                        {t('preview.itemHeader')}
                                    </th>
                                    {(quote.show_quantity ?? true) && (
                                        <>
                                            <th className="py-2 text-center font-bold text-xs uppercase text-gray-500">
                                                {t('preview.quantityHeader')}
                                            </th>
                                            <th className="py-2 text-right font-bold text-xs uppercase text-gray-500">
                                                {t('preview.priceHeader')}
                                            </th>
                                        </>
                                    )}

                                    {/* ✅ NOVA COLUMNA IMPOSTOS */}
                                    {(quote.show_quantity ?? true) && (
                                        <th className="py-2 text-right font-bold text-xs uppercase text-gray-500">
                                            Impostos
                                        </th>
                                    )}

                                    <th className="py-2 text-right font-bold text-xs uppercase text-gray-500">
                                        {t('preview.totalHeader')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700">
                                {quote.items?.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-100 last:border-0">
                                        <td className="py-3 pr-2 align-top">
                                            <p className="font-medium text-gray-900">{item.description}</p>
                                        </td>
                                        {(quote.show_quantity ?? true) && (
                                            <>
                                                <td className="py-3 text-center align-top">{item.quantity}</td>
                                                <td className="py-3 text-right align-top">{formatCurrency(item.unit_price ?? 0)}</td>
                                            </>
                                        )}

                                        {/* ✅ NOVA CEL·LA IMPOSTOS */}
                                        {(quote.show_quantity?? true) && (
                                            <td className="py-3 text-right align-top">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    {item.taxes && item.taxes.length > 0 ? (
                                                        item.taxes.map(t => (
                                                            <span key={t.id} className="text-xs text-gray-500 whitespace-nowrap">
                                                                {t.name} 
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        <td className="py-3 text-right font-medium align-top">
                                            {formatCurrency(calculateLineTotal(item))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* TOTALS */}
                    <section className="flex justify-end mb-12">
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <p>{t('totals.subtotal')}:</p>
                                <p className="font-medium text-gray-900">{formatCurrency(subtotal)}</p>
                            </div>

                            {discount_amount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <p>{t('preview.discountLine')}</p>
                                    <p>-{formatCurrency(discount_amount)}</p>
                                </div>
                            )}

                            <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                                <p>{t('totals.taxableBase')}:</p>
                                <p>{formatCurrency(base)}</p>
                            </div>

                            {/* DESGLOSSAMENT D'IMPOSTOS */}
                            {Object.entries(taxBreakdown).length > 0 ? (
                                Object.entries(taxBreakdown).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between text-gray-600">
                                        <p>{name}</p>
                                        <p>{formatCurrency(amount)}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="flex justify-between text-gray-600">
                                    <p>{t('totals.taxes')}</p>
                                    <p>€0.00</p>
                                </div>
                            )}

                            <div className="flex justify-between font-bold text-xl text-gray-900 pt-3 border-t-2 border-gray-900 mt-2">
                                <p>{t('preview.totalHeader')}:</p>
                                <p>{formatCurrency(total_amount)}</p>
                            </div>
                        </div>
                    </section>

                    {/* FOOTER */}
                    {quote.notes && (
                        <footer className="pt-6 border-t border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wide">{t('preview.notesAndTerms')}</h3>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                {quote.notes}
                            </p>
                        </footer>
                    )}
                </div>
            </div>
        </aside>
    );
};