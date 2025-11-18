"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { type EditableQuote } from "@/types/finances/quotes";
import { formatCurrency } from '@/lib/utils/formatters'; 

interface QuoteTotalsProps {
    subtotal: number;
    discountAmountCalculated: number;
    tax_amount: number;
    total_amount: number;
    
    taxBreakdown?: Record<string, number>;

    discount_percent_input: number | null;
    tax_percent_input: number | null;

    // ✅ CORRECCIÓ: Utilitzem la signatura genèrica correcta en lloc de 'value: unknown'
    onQuoteChange: <K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => void;
}

export const QuoteTotals: React.FC<QuoteTotalsProps> = ({
    subtotal,
    discountAmountCalculated,
    tax_amount,
    total_amount,
    taxBreakdown = {},
    discount_percent_input,
    onQuoteChange
}) => {
    const t = useTranslations('QuoteEditor.totals');
    const taxableBase = subtotal - discountAmountCalculated;

    return (
        <div className="mt-6 ml-auto w-full max-w-sm space-y-2 px-4 py-2">
            {/* Subtotal */}
            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {/* Descompte Global */}
            <div className="flex justify-between items-center">
                <Label htmlFor="discount_percent_input" className="text-muted-foreground">{t('discount')}</Label>
                <div className="flex items-center gap-1">
                    <Input
                        id="discount_percent_input"
                        type="number"
                        value={discount_percent_input ?? 0}
                        onChange={(e) => onQuoteChange('discount_percent_input', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-right bg-transparent"
                        placeholder="0"
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
            </div>
            {discountAmountCalculated > 0 && (
                <div className="flex justify-between text-muted-foreground text-sm">
                    <span>{t('discountAmount')}</span>
                    <span>-{formatCurrency(discountAmountCalculated)}</span>
                </div>
            )}

            {/* Base Imposable */}
            <div className="flex justify-between pt-2 border-t border-border/50">
                <span className="text-muted-foreground">{t('taxableBase')}</span>
                <span>{formatCurrency(taxableBase)}</span>
            </div>

            {/* Llista d'Impostos Desglossats */}
            <div className="py-2 space-y-1">
                {Object.entries(taxBreakdown).length > 0 ? (
                    Object.entries(taxBreakdown).map(([name, amount]) => (
                        <div key={name} className="flex justify-between text-sm text-muted-foreground">
                            <span>{name}</span>
                            <span>{formatCurrency(amount)}</span>
                        </div>
                    ))
                ) : (
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('taxes')}</span>
                        <span>€0.00</span>
                    </div>
                )}
            </div>

            {/* Total Final */}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>{t('total')}</span>
                <span>{formatCurrency(total_amount)}</span>
            </div>
        </div>
    );
};