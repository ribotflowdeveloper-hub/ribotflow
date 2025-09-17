"use client";

import React from 'react';
import Image from 'next/image';
import type { Quote, Contact, CompanyProfile } from '@/types/crm';
import { useTranslations } from 'next-intl';

// Definim les propietats que necessita el component per renderitzar-se.
interface QuotePreviewProps {
    quote: Quote;
    contacts: Contact[];
    companyProfile: CompanyProfile | null; // El perfil de l'empresa pot no existir.
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
}

/**
 * Component purament visual que renderitza una vista prèvia del pressupost
 * amb un format semblant a un document PDF.
 * Aquest mateix component s'utilitza per generar el PDF real.
 */
export const QuotePreview = ({ quote, contacts, companyProfile, subtotal, discountAmount, tax, total }: QuotePreviewProps) => {
    // Trobem el contacte específic per a aquest pressupost.
    const contact = contacts.find(c => c.id === quote.contact_id);
    const base = subtotal - discountAmount;
    const t = useTranslations('QuoteEditor');
 

    // El 'return' renderitza tota l'estructura visual del document.
    // L'ús de '?.' (optional chaining) és important per evitar errors si 'companyProfile' o 'contact' són nuls.
    
    return (
        <aside className="hidden lg:block glass-card p-4 overflow-y-auto">
            <div id="quote-preview-for-pdf">
                <div className="bg-white text-gray-900 p-8 rounded-lg shadow-lg font-sans text-sm min-h-full">
                    <header className="flex justify-between items-start border-b-2 border-gray-200 pb-4">
                        {companyProfile?.logo_url ? <Image src={companyProfile.logo_url} alt="Logo" width={90} height={44} className="object-contain" /> : <div className="h-14 w-32 ...">{t('preview.logoPlaceholder')}</div>}
                        <div className="text-right">
                            <p className="font-bold text-xl">{companyProfile?.company_name || t('preview.yourCompany')}</p>
                            <p className="text-gray-500 mt-1"># {quote.quote_number || t('preview.pending')}</p>
                        </div>
                    </header>
                    <section className="grid grid-cols-2 gap-8 my-6">
                        <div>
                            <p className="font-semibold">{companyProfile?.company_name || t('preview.yourCompany')}</p>
                            <p className="text-gray-600">{companyProfile?.company_address}</p>
                            <p className="text-gray-600">{companyProfile?.company_tax_id}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">{contact?.nom || t('preview.unselectedClient')}</p>
                            <p className="text-gray-600">{contact?.empresa}</p>
                        </div>
                    </section>
                    <section className="grid grid-cols-2 gap-8 my-6">
                        <div><p className="text-xs text-gray-500 font-bold">{t('preview.issueDate')}</p><p>{quote.issue_date ? new Date(quote.issue_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' }) : ''}</p></div>
                        <div className="text-right"><p className="text-xs text-gray-500 font-bold">{t('preview.expiryDate')}</p><p>{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' }) : 'N/A'}</p></div>
                    </section>
                    <section>
                    <table className="w-full">
                            <thead className="bg-gray-100"><tr><th className="p-2 text-left font-bold text-xs uppercase">{t('preview.itemHeader')}</th><th className="p-2 text-right font-bold text-xs uppercase">{t('preview.totalHeader')}</th></tr></thead>
                            <tbody>
                                {quote.items?.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200"><td className="p-2 pr-2">{item.description}</td><td className="text-right p-2 font-medium">{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)} €</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                    <section className="flex justify-end mt-6">
                        <div className="w-full max-w-xs space-y-2">
                             {/* ✅ CORRECCIÓ: Ara les claus funcionaran correctament */}
                            <div className="flex justify-between"><p className="text-gray-600">{t('totals.subtotal')}:</p><p>{subtotal.toFixed(2)} €</p></div>
                            {quote.discount > 0 && (<div className="flex justify-between text-green-600"><p>{t('preview.discountLine')}</p><p>-{discountAmount.toFixed(2)} € ({quote.discount}%)</p></div>)}
                            <div className="flex justify-between"><p className="text-gray-600">{t('totals.taxableBase')}:</p><p>{base.toFixed(2)} €</p></div>
                            <div className="flex justify-between"><p className="text-gray-600">{t('preview.taxesLine')}</p><p>{tax.toFixed(2)} €</p></div>
                            <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t-2 border-gray-800"><p>{t('preview.totalHeader')}:</p><p>{total.toFixed(2)} €</p></div>
                        </div>
                    </section>
                    <footer className="mt-10 pt-6 border-t border-gray-200">
                        <h3 className="font-bold mb-2">{t('preview.notesAndTerms')}</h3>
                        <p className="text-xs text-gray-500 whitespace-pre-wrap">{quote.notes}</p>
                    </footer>
                </div>
            </div>
        </aside>
    );
};