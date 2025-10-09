// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/_components/QuoteMeta.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import type { Quote, Contact } from '@/types/crm';
import { useTranslations } from 'next-intl';

/**
 * Component per gestionar les metadades d'un pressupost:
 * - El client associat.
 * - El número de pressupost.
 * - Les dates d'emissió i venciment.
 */

// ✅ PAS 2.1: Definim les noves props. Més específiques i sense 'setQuote'.
interface QuoteMetaProps {
    contact_id: string | null;
    quote_number: string | null;
    issue_date: string;
    expiry_date: string | null;
    // La definició de la funció ara també és genèrica.
    onMetaChange: <K extends keyof Quote>(field: K, value: Quote[K]) => void;
    contacts: Contact[];
}
export const QuoteMeta = ({
    contact_id,
    quote_number,
    issue_date,
    expiry_date,
    onMetaChange,
    contacts
}: QuoteMetaProps) => {

    // ✅ CORRECCIÓ 1: Utilitza la prop 'contact_id' directament, no 'quote.contact_id'
    const selectedContact = contacts.find(c => c.id === contact_id);
    const t = useTranslations('QuoteEditor.meta');

    // Funció per convertir la data per a l'input de tipus 'date'
    const formatDateForInput = (dateString: string) => {
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    return (
        <div className="glass-card p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>{t('clientLabel')}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal mt-1">
                                {selectedContact ? `${selectedContact.nom} (${selectedContact.empresa || ''})` : t('selectClientPlaceholder')}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect">
                            <Command>
                                <CommandInput placeholder={t('searchClientPlaceholder')} />
                                <CommandList>
                                    <CommandEmpty>{t('noClientFound')}</CommandEmpty>
                                    <CommandGroup>
                                        {contacts.map(c => (
                                            // ✅ PAS 2.2: Utilitzem el nou callback 'onMetaChange'
                                            <CommandItem key={c.id} value={`${c.nom} ${c.empresa}`} onSelect={() => onMetaChange('contact_id', c.id)}>
                                                <Check className={cn("mr-2 h-4 w-4", contact_id === c.id ? "opacity-100" : "opacity-0")} />
                                                {c.nom} <span className="text-xs text-muted-foreground ml-2">{c.empresa}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Número de Pressupost */}
                <div className="flex flex-col">
                    <Label htmlFor="quote_number" className="mb-1">{t('quoteNumberLabel')}</Label>
                    {/* ✅ CORRECCIÓ: Utilitza onMetaChange */}
                    <Input
                        id="quote_number"
                        type="text" // ✅ CORRECCIÓ
                        value={quote_number || ''}
                        onChange={(e) => onMetaChange('quote_number', e.target.value)}
                    />
                </div>

                {/* Data d'Emissió */}
                <div className="flex flex-col">
                    <Label htmlFor="issue_date" className="mb-1">{t('issueDateLabel')}</Label>
                    {/* ✅ CORRECCIÓ: Utilitza onMetaChange */}
                    <Input
                        id="issue_date"
                        type="date"
                        value={formatDateForInput(issue_date)}
                        onChange={(e) => onMetaChange('issue_date', e.target.value)}
                    />
                </div>

                {/* Data de Venciment */}
                <div className="flex flex-col">
                    <Label htmlFor="expiry_date" className="mb-1">{t('expiryDateLabel')}</Label>
                    {/* ✅ CORRECCIÓ: Utilitza onMetaChange */}
                    <Input
                        id="expiry_date"
                        type="date"
                        value={expiry_date ? formatDateForInput(expiry_date) : ''}
                        onChange={(e) => onMetaChange('expiry_date', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};