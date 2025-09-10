// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/_components/QuotePreview.tsx
"use client";

import React from 'react';
import Image from 'next/image'; // ✅ CORRECCIÓ: Importem el component Image de Next.js
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Quote, Contact, CompanyProfile } from '../page';

export const QuotePreview = ({ quote, contacts, companyProfile, subtotal, discountAmount, tax, total }: {
    quote: Quote;
    contacts: Contact[];
    companyProfile: CompanyProfile;
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
}) => {
    const contact = contacts.find(c => c.id === quote.contact_id);
    const base = subtotal - discountAmount;
    
    return (
        <aside className="hidden lg:block glass-card p-4 overflow-y-auto">
            <div id="quote-preview-for-pdf">
                <div className="bg-white text-gray-900 p-8 rounded-lg shadow-lg font-sans text-sm min-h-full">
                    <header className="flex justify-between items-start border-b-2 border-gray-200">
                        {companyProfile?.logo_url ? (
                            // ✅ CORRECCIÓ: Afegim 'width' i 'height' i eliminem les classes de mida.
                            <Image 
                                src={companyProfile.logo_url} 
                                alt="Logo" 
                                width={90}
                                height={44}
                                className="object-contain" 
                            />
                        ) : (
                            <div className="h-14 w-32 bg-gray-200 flex items-center justify-center text-sm text-gray-400">El teu Logo</div>
                        )}
                        <div className="text-right">
                            <p className="font-bold text-xl">{companyProfile?.company_name || 'La Teva Empresa'}</p>
                            <p className="text-gray-500 mt-1"># {quote.quote_number || 'Pendent'}</p>
                        </div>
                    </header>
                    <section className="grid grid-cols-2 gap-8 my-6">
                        <div>
                            <p className="font-semibold">{companyProfile?.company_name || 'La Teva Empresa'}</p>
                            <p className="text-gray-600">{companyProfile?.company_address}</p>
                            <p className="text-gray-600">{companyProfile?.company_tax_id}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">{contact?.nom || 'Client no seleccionat'}</p>
                            <p className="text-gray-600">{contact?.empresa}</p>
                        </div>
                    </section>
                    <section className="grid grid-cols-2 gap-8 my-6">
                        <div><p className="text-xs text-gray-500 font-bold">Data Emissió:</p><p>{quote.issue_date ? new Date(quote.issue_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' }) : ''}</p></div>
                        <div className="text-right"><p className="text-xs text-gray-500 font-bold">Data Venciment:</p><p>{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' }) : 'N/A'}</p></div>
                    </section>
                    <section>
                        <table className="w-full">
                            <thead className="bg-gray-100"><tr><th className="p-2 text-left font-bold text-xs uppercase">Concepte</th><th className="p-2 text-right font-bold text-xs uppercase">Total</th></tr></thead>
                            <tbody>
                                {quote.items?.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200"><td className="p-2 pr-2">{item.description}</td><td className="text-right p-2 font-medium">{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)} €</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                    <section className="flex justify-end mt-6">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between"><p className="text-gray-600">Subtotal:</p><p>{subtotal.toFixed(2)} €</p></div>
                            {quote.discount > 0 && (<div className="flex justify-between text-green-600"><p>Descompte:</p><p>-€{discountAmount.toFixed(2)} ({quote.discount}%)</p></div>)}
                            <div className="flex justify-between"><p className="text-gray-600">Base Imposable:</p><p>{base.toFixed(2)} €</p></div>
                            <div className="flex justify-between"><p className="text-gray-600">Impostos (21%):</p><p>{tax.toFixed(2)} €</p></div>
                            <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t-2 border-gray-800"><p>TOTAL:</p><p>{total.toFixed(2)} €</p></div>
                        </div>
                    </section>
                    <footer className="mt-10 pt-6 border-t border-gray-200">
                        <h3 className="font-bold mb-2">Notes i Termes</h3>
                        <p className="text-xs text-gray-500 whitespace-pre-wrap">{quote.notes}</p>
                    </footer>
                </div>
            </div>
        </aside>
    );
};