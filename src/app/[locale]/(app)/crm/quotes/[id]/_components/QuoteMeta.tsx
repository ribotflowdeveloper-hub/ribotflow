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
export const QuoteMeta = ({ quote, setQuote, contacts }: {
    quote: Quote;
    setQuote: React.Dispatch<React.SetStateAction<Quote>>;
    contacts: Contact[];
}) => {
    const selectedContact = contacts.find(c => c.id === quote.contact_id);
    const t = useTranslations('QuoteEditor.meta');

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
                                            <CommandItem key={c.id} value={`${c.nom} ${c.empresa}`} onSelect={() => setQuote(q => ({ ...q, contact_id: c.id, opportunity_id: null }))}>
                                                <Check className={cn("mr-2 h-4 w-4", quote.contact_id === c.id ? "opacity-100" : "opacity-0")} />
                                                {c.nom} <span className="text-xs text-muted-foreground ml-2">{c.empresa}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label>{t('quoteNumberLabel')}</Label>
                    <Input value={quote.quote_number || ''} onChange={(e) => setQuote(q => ({ ...q, quote_number: e.target.value }))} className="mt-1" />
                </div>
                <div>
                    <Label>{t('issueDateLabel')}</Label>
                    <Input type="date" value={quote.issue_date} onChange={(e) => setQuote(q => ({ ...q, issue_date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                    <Label>{t('expiryDateLabel')}</Label>
                    <Input type="date" value={quote.expiry_date || ''} onChange={(e) => setQuote(q => ({ ...q, expiry_date: e.target.value }))} className="mt-1" />
                </div>
            </div>
        </div>
    );
};
