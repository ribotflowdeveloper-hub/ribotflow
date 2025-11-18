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
import type { EditableQuote } from '@/types/finances/quotes'; // Assegura't que importes del lloc correcte

// --- Tipus ---
type ContactSelection = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom' | 'empresa'>;

interface QuoteMetaProps {
    // ✅ CORRECCIÓ: Permetem null en aquests camps perquè quan crees un pressupost poden estar buits inicialment
    contact_id: string | null;
    quote_number: string | null; 
    issue_date: string | null;
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
    const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false);
    
    // Convertim a número de forma segura
    const contactIdNum = contact_id ? Number(contact_id) : null;
    const selectedContact = contacts.find(c => c.id === contactIdNum);
    
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
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector de Client */}
                <div>
                    <Label>{t('clientLabel')}</Label>
                    <Popover
                        open={isContactPopoverOpen}
                        onOpenChange={setIsContactPopoverOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal mt-1 text-foreground">
                                {selectedContact ? (
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
                                        {contacts.map((c) => (
                                            <CommandItem
                                                key={c.id}
                                                value={`${c.nom} ${c.empresa}`}
                                                onSelect={() => {
                                                    onMetaChange("contact_id", c.id);
                                                    setIsContactPopoverOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        contactIdNum === c.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <span className="text-foreground">{c.nom}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    {c.empresa}
                                                </span>
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
                    <Input
                        id="quote_number"
                        type="text"
                        // ✅ Utilitzem || '' per evitar errors de "controlled input" amb null
                        value={quote_number || ''}
                        onChange={(e) => onMetaChange('quote_number', e.target.value)}
                    />
                </div>

                {/* Data d'Emissió */}
                <div className="flex flex-col">
                    <Label htmlFor="issue_date" className="mb-1">{t('issueDateLabel')}</Label>
                    <Input
                        id="issue_date"
                        type="date"
                        value={formatDateForInput(issue_date)}
                        onChange={(e) => onMetaChange('issue_date', e.target.value)}
                    />
                </div>

                {/* Data de Caducitat */}
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