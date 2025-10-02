"use client";

import React from 'react';
// Hem eliminat la importació de 'next/image' perquè farem servir una etiqueta <img> estàndard
import type { Quote, Contact } from '@/types/crm';
import { useTranslations } from 'next-intl';
import type { TeamData, CompanyProfile } from '@/types/settings';

// --------------------
// Tipus de propietats
// --------------------
interface QuotePreviewProps {
    quote: Quote;
    contacts: Contact[];
    companyProfile: TeamData | null;
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
}

// ---------------------------------------------------------
// Funció per mapejar les dades de l'equip cap al perfil empresa
// ---------------------------------------------------------
const mapTeamDataToProfile = (teamData: TeamData | null): CompanyProfile | null => {
    if (!teamData) return null;

    return {
        id: teamData.id,
        company_name: teamData.name,
        company_tax_id: teamData.tax_id,
        company_address: teamData.address,
        company_email: teamData.email,
        company_phone: teamData.phone,
        logo_url: teamData.logo_url,
    };
};

// --------------------------
// Component principal: QuotePreview
// --------------------------
export const QuotePreview = ({
    quote,
    contacts,
    companyProfile,
    subtotal,
    discountAmount,
    tax,
    total
}: QuotePreviewProps) => {

    // Obtenim el contacte associat al pressupost
    const contact = contacts.find(c => c.id === quote.contact_id);

    // Base imposable (subtotal - descompte)
    const base = subtotal - discountAmount;

    // Hook per traduccions
    const t = useTranslations('QuoteEditor');

    // Transformació de dades d'equip a perfil empresa
    const displayProfile = mapTeamDataToProfile(companyProfile);

    return (
        // El 'aside' és només un contenidor a la UI (no forma part del PDF)
        <aside className="hidden lg:block glass-card p-4 overflow-y-auto">

            {/* AQUEST DIV ES CONVERTIRÀ A PDF */}
            <div id="quote-preview-for-pdf">
                <div className="bg-white text-gray-900 px-8 py-2 font-sans text-sm">

                    {/* ---------------- HEADER ---------------- */}
                    {/* ✅ HEM MODIFICAT AQUESTA SECCIÓ */}
                    <header className="flex justify-between items-center border-b-2 border-gray-200"> {/* Reduït el padding inferior (pb-2) */}
                        {/* Logo de l'empresa o placeholder */}
                        {displayProfile?.logo_url ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={displayProfile.logo_url}
                                    alt="Logo"
                                    style={{ maxWidth: '100px', height: '70px', objectFit: 'contain' }}
                                    crossOrigin="anonymous"
                                />
                            </>
                        ) : (
                            <div className="h-12 w-28 flex items-center justify-center bg-gray-100 text-gray-400 text-xs rounded">
                                {t('preview.logoPlaceholder')}
                            </div>
                        )}
                        {/* ✅ Aquest 'div' ara té menys marge superior per a apropar-se al logo */}
                        <div className="text-right ml-2"> {/* Afegit marge esquerre per a separar del logo */}
                            <p className="font-bold text-lg">{displayProfile?.company_name || t('preview.yourCompany')}</p>
                            <p className="text-gray-500 text-base mt-0"># {quote.quote_number || t('preview.pending')}</p>
                        </div>
                    </header>

                    {/* ---------------- DADES EMPRESA I CLIENT ---------------- */}
                    <section className="grid grid-cols-2 gap-8 my-4">
                        <div>
                            <p className="font-semibold">
                                {displayProfile?.company_name || t('preview.yourCompany')}
                            </p>
                            <p className="text-gray-600">{displayProfile?.company_address}</p>
                            <p className="text-gray-600">{displayProfile?.company_tax_id}</p>
                            <p className="text-gray-600">{displayProfile?.company_email}</p>

                        </div>

                        <div className="text-right">
                            <p className="font-semibold">
                                {contact?.nom || t('preview.unselectedClient')}
                            </p>
                            <p className="text-gray-600">{contact?.empresa}</p>
                            <p className="text-gray-600">{contact?.email}</p>

                        </div>
                    </section>

                    {/* ---------------- DATES ---------------- */}
                    <section className="grid grid-cols-2 gap-8 my-6">
                        <div>
                            <p className="text-xs text-gray-500 font-bold">{t('preview.issueDate')}</p>
                            <p>
                                {quote.issue_date
                                    ? new Date(quote.issue_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' })
                                    : ''}
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs text-gray-500 font-bold">{t('preview.expiryDate')}</p>
                            <p>
                                {quote.expiry_date
                                    ? new Date(quote.expiry_date).toLocaleDateString('ca-ES', { timeZone: 'UTC' })
                                    : 'N/A'}
                            </p>
                        </div>
                    </section>

                    {/* ---------------- TAULA D'ITEMS ---------------- */}
                    {/* ---------------- TAULA D'ITEMS (AMB LÒGICA CONDICIONAL) ---------------- */}
                    <section>
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left font-bold text-xs uppercase w-[60%]">
                                        {t('preview.itemHeader')}
                                    </th>

                                    {/* ✅ Mostrem/amaguem les columnes segons la preferència */}
                                    {(quote.show_quantity ?? true) && (
                                        <>
                                            <th className="p-2 text-center font-bold text-xs uppercase">
                                                {t('preview.quantityHeader')}
                                            </th>
                                            <th className="p-2 text-right font-bold text-xs uppercase">
                                                {t('preview.priceHeader')}
                                            </th>
                                        </>
                                    )}

                                    <th className="p-2 text-right font-bold text-xs uppercase">
                                        {t('preview.totalHeader')}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {quote.items?.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200">
                                        <td className="p-2 pr-2">
                                            {/* ✅ CORRECCIÓ 2: El 'p' amb la quantitat extra s'ha eliminat. */}
                                            {item.description}
                                        </td>
                                        
                                        {/* Mostrem/amaguem les cel·les corresponents */}
                                        {(quote.show_quantity ?? true) && (
                                            <>
                                                <td className="text-center p-2">{item.quantity}</td>
                                                <td className="text-right p-2">{item.unit_price?.toFixed(2)} €</td>
                                            </>
                                        )}

                                        <td className="text-right p-2 font-medium">
                                            {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)} €
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ---------------- TOTALS ---------------- */}
                    <section className="flex justify-end mt-6">
                        <div className="w-full max-w-xs space-y-2">

                            {/* Subtotal */}
                            <div className="flex justify-between">
                                <p className="text-gray-600">{t('totals.subtotal')}:</p>
                                <p>{subtotal.toFixed(2)} €</p>
                            </div>

                            {/* Descompte */}
                            {quote.discount && quote.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <p>{t('preview.discountLine')} ({quote.discount}%)</p>
                                    <p>-{discountAmount.toFixed(2)} €</p>
                                </div>
                            )}

                            {/* Base imposable */}
                            <div className="flex justify-between">
                                <p className="text-gray-600">{t('totals.taxableBase')}:</p>
                                <p>{base.toFixed(2)} €</p>
                            </div>

                            {/* IVA */}
                            <div className="flex justify-between">
                                <p className="text-gray-600">
                                    {t('preview.taxesLine')} ({quote.tax_percent ?? 21}%)
                                </p>
                                <p>{tax.toFixed(2)} €</p>
                            </div>

                            {/* TOTAL FINAL */}
                            <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t-2 border-gray-800">
                                <p>{t('preview.totalHeader')}:</p>
                                <p>{total.toFixed(2)} €</p>
                            </div>
                        </div>
                    </section>

                    {/* ---------------- NOTES I CONDICIONS ---------------- */}
                    <footer className="mt-10 pt-6 border-t border-gray-200">
                        <h3 className="font-bold mb-2">{t('preview.notesAndTerms')}</h3>
                        {/* ✅ CANVI: Hem canviat 'text-xs' per 'text-sm' i 'text-gray-500' per 'text-gray-600' */}
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {quote.notes}
                        </p>
                    </footer>

                </div>
            </div>
        </aside>
    );
};
