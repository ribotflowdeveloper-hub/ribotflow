"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

/**
 * Component dedicat a mostrar la secció de totals del pressupost (subtotal, descomptes, impostos, total).
 * Permet a l'usuari introduir un percentatge de descompte.
 */
export const QuoteTotals = ({ subtotal, discount, setDiscount, discountAmount, tax, total }: {
    subtotal: number;
    discount: number; // El percentatge de descompte.
    setDiscount: (discount: number) => void; // Funció per actualitzar el descompte al component pare.
    discountAmount: number; // L'import calculat del descompte.
    tax: number; // L'import dels impostos.
    total: number; // El total final.
}) => {
    const t = useTranslations('QuoteEditor.totals');
    return (
        <div className="glass-card p-6">
            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span>€{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('discount')}</span>
                        <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 h-8 text-right bg-transparent" placeholder="0" />
                    </div>
                    <div className="flex justify-between text-muted-foreground"><span>{t('discountAmount')}</span><span>-€{discountAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('taxableBase')}</span><span>€{(subtotal - discountAmount).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('taxes')}</span><span>€{tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span>{t('total')}</span><span>€{total.toFixed(2)}</span></div>
                </div>
            </div>
        </div>
    );
};
