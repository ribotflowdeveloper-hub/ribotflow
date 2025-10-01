"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Importem el component Label
import { useTranslations } from 'next-intl';

// Definim les props correctament
interface QuoteTotalsProps {
    subtotal: number;
    discount: number | null;
    setDiscount: (discount: number) => void;
    discountAmount: number;
    tax: number;
    total: number;
    tax_percent: number | null;
    setTaxPercent: (value: number) => void;
}

export const QuoteTotals: React.FC<QuoteTotalsProps> = ({ 
    subtotal, 
    discount, 
    setDiscount, 
    discountAmount, 
    tax, 
    total,
    tax_percent,
    setTaxPercent
}) => {
    const t = useTranslations('QuoteEditor.totals');
    
    return (
        <div className="mt-6 ml-auto w-full max-w-sm space-y-2">
            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
                <Label htmlFor="discount" className="text-muted-foreground">{t('discount')}</Label>
                <div className="flex items-center gap-1">
                    <Input 
                        id="discount"
                        type="number" 
                        value={discount ?? 0} 
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
                        className="w-16 h-8 text-right bg-transparent" 
                        placeholder="0" 
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
            </div>

            {discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                    <span>{t('discountAmount')}</span>
                    <span>-€{discountAmount.toFixed(2)}</span>
                </div>
            )}

            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('taxableBase')}</span>
                <span>€{(subtotal - discountAmount).toFixed(2)}</span>
            </div>
            
            {/* ✅ AQUESTA ÉS LA LÒGICA COMPLETADA PER A L'IVA */}
            <div className="flex justify-between items-center">
                <Label htmlFor="tax_percent" className="text-muted-foreground">{t('taxes')}</Label>
                <div className="flex items-center gap-1">
                    <Input
                        id="tax_percent"
                        type="number"
                        value={tax_percent ?? 21}
                        onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-right bg-transparent"
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
                <span className="font-medium">€{tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>{t('total')}</span>
                <span>€{total.toFixed(2)}</span>
            </div>
        </div>
    );
};