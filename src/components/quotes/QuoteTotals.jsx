// ============================================================================
// Fitxer: src/components/quotes/QuoteTotals.jsx (Versió corregida)
// ============================================================================
import React from 'react';
import { Input } from '@/components/ui/input';

export const QuoteTotals = ({ subtotal, discount, setDiscount, discountAmount, tax, total }) => (
    <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2">
            
            <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>€{subtotal.toFixed(2)}</span>
            </div>

            {/* Ara demanem un percentatge */}
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Descompte (%)</span>
                <Input 
                    type="number" 
                    value={discount} 
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
                    className="w-24 h-8 text-right bg-transparent"
                    placeholder="0"
                />
            </div>

            {/* Mostrem l'import del descompte calculat */}
            <div className="flex justify-between text-muted-foreground">
                <span>Import Descompte</span>
                <span>-€{discountAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
                <span className="text-muted-foreground">Base Imposable</span>
                <span>€{(subtotal - discountAmount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
                <span className="text-muted-foreground">Impostos (IVA 21%)</span>
                <span>€{tax.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total</span>
                <span>€{total.toFixed(2)}</span>
            </div>
            
        </div>
    </div>
);