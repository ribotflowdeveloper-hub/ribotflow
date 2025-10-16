// /app/[locale]/(app)/crm/quotes/[id]/_components/QuoteMeta.tsx (Refactoritzat per al Disseny)
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useTranslations } from 'next-intl';
import type { Database } from '@/types/supabase';
import type { EditableQuote } from '../_hooks/useQuoteEditor';

// --- Tipus Derivats de la Base de Dades ---
type ContactSelection = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom' | 'empresa'>;

/**
 * Component per gestionar les metadades d'un pressupost.
 */

interface QuoteMetaProps {
    contact_id: string | null;
    quote_number: string;
    issue_date: string;
    expiry_date: string | null;
    onMetaChange: <K extends keyof EditableQuote>(field: K, value: EditableQuote[K]) => void;
    contacts: ContactSelection[];
}

export const QuoteMeta = ({
    contact_id,
    quote_number,
    issue_date,
    expiry_date,
    onMetaChange,
    contacts
}: QuoteMetaProps) => {

    const selectedContact = contacts.find(c => c.id === (contact_id !== null ? Number(contact_id) : null));
    const t = useTranslations('QuoteEditor.meta');

    const formatDateForInput = (dateString: string | null) => {
        if (!dateString) return '';
        try {
            return dateString.split('T')[0];
        } catch {
            return '';
        }
    };

    return (
        // ❌ Eliminem el 'glass-card p-2' ja que s'ha mogut a la Card pare
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>{t('clientLabel')}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            {/* ✅ CORRECCIÓ: Afegim 'text-foreground' (negre/fosc) al botó per visibilitat */}
                            <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal mt-1 text-foreground">
                                {selectedContact ? (
                                    // ✅ Ús de text-foreground per al text principal.
                                    <span className="text-foreground">
                                        {`${selectedContact.nom} `}
                                        <span className="text-muted-foreground text-xs">
                                            ({selectedContact.empresa || ''})
                                        </span>
                                    </span>
                                ) : t('selectClientPlaceholder')}
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
                                            <CommandItem 
                                                key={c.id} 
                                                value={`${c.nom} ${c.empresa}`} 
                                                // ⚠️ Convertim l'ID a string o 'new' abans de passar-lo,
                                                // tot i que en el context del form es tracta com a Number | null.
                                                // onMetaChange('contact_id', c.id) és correcte segons la definició de EditableQuote
                                                // que utilitza Number (el hook ho gestiona)
                                                onSelect={() => onMetaChange('contact_id', c.id)} 
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", contact_id !== null && Number(contact_id) === c.id ? "opacity-100" : "opacity-0")} />
                                                {/* ✅ Ajustem el text per contrast a la ComandItem */}
                                                <span className="text-foreground">{c.nom}</span> 
                                                <span className="text-xs text-muted-foreground ml-2">{c.empresa}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex flex-col">
                    <Label htmlFor="quote_number" className="mb-1">{t('quoteNumberLabel')}</Label>
                    <Input
                        id="quote_number"
                        type="text"
                        value={quote_number || ''}
                        onChange={(e) => onMetaChange('quote_number', e.target.value)}
                    />
                </div>
                <div className="flex flex-col">
                    <Label htmlFor="issue_date" className="mb-1">{t('issueDateLabel')}</Label>
                    <Input
                        id="issue_date"
                        type="date"
                        value={formatDateForInput(issue_date)}
                        onChange={(e) => onMetaChange('issue_date', e.target.value)}
                    />
                </div>
                <div className="flex flex-col">
                    <Label htmlFor="expiry_date" className="mb-1">{t('expiryDateLabel')}</Label>
                    <Input
                        id="expiry_date"
                        type="date"
                        value={formatDateForInput(expiry_date)}
                        onChange={(e) => onMetaChange('expiry_date', e.target.value || null)}
                    />
                </div>
            </div>
        </div>
    );
};