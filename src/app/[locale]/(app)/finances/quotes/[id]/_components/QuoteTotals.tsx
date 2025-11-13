// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteTotals.tsx (CORREGIT AMB LÒGICA DE PERCENTATGES)
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { type EditableQuote } from '../_hooks/useQuoteEditor';

// ✅ 1. Definim les Props correctes (Lògica de %)
interface QuoteTotalsProps {
    subtotal: number;
    discountAmountCalculated: number; // El valor en € calculat
    tax_amount: number;
    total_amount: number;

    // Valors dels inputs (en %)
    discount_percent_input: number | null;
    tax_percent_input: number | null;

    onQuoteChange: <K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => void;
}

export const QuoteTotals: React.FC<QuoteTotalsProps> = ({
    subtotal,
    discountAmountCalculated,
    tax_amount,
    total_amount,
    discount_percent_input,
    tax_percent_input,
    onQuoteChange
}) => {
    const t = useTranslations('QuoteEditor.totals');

    // ✅ 2. Calculem la base (això arregla el NaN)
    const taxableBase = subtotal - discountAmountCalculated;

    return (
        <div className="mt-6 ml-auto w-full max-w-sm space-y-2 px-4 py-2">
            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
            </div>

            {/* ✅ 3. Input de Descompte (en %) */}
            <div className="flex justify-between items-center">
                <Label htmlFor="discount_percent_input" className="text-muted-foreground">{t('discount')}</Label>
                <div className="flex items-center gap-1">
                    <Input
                        id="discount_percent_input"
                        type="number"
                        value={discount_percent_input ?? 0} // 👈 Llegim el %
                        // 👈 Actualitzem el camp _input al hook
                        onChange={(e) => onQuoteChange('discount_percent_input', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-right bg-transparent"
                        placeholder="0"
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
            </div>

            {/* ✅ 4. Mostrem el valor calculat (en €) */}
            {discountAmountCalculated > 0 && (
                <div className="flex justify-between text-muted-foreground">
                    <span>{t('discountAmount')}</span>
                    <span>-€{discountAmountCalculated.toFixed(2)}</span>
                </div>
            )}

            {/* ✅ 5. Mostrem la Base Imposable (com demanaves) */}
            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('taxableBase')}</span>
                <span>€{taxableBase.toFixed(2)}</span>
            </div>

            {/* ✅ 6. Input d'Impostos (en %) */}
            <div className="flex justify-between items-center">
                <Label htmlFor="tax_percent_input" className="text-muted-foreground">{t('taxes')}</Label>
                <div className="flex items-center gap-1">
                    <Input
                        id="tax_percent_input"
                        type="number"
                        value={tax_percent_input ?? 21} // 👈 Llegim el %
                        // 👈 Actualitzem el camp _input al hook
                        onChange={(e) => onQuoteChange('tax_percent_input', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-right bg-transparent"
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
                <span className="font-medium">€{tax_amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>{t('total')}</span>
                <span>€{total_amount.toFixed(2)}</span>
            </div>
        </div>
    );
};