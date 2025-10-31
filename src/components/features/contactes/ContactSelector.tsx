"use client";

import { FC, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils/utils";
import { type Database } from '@/types/supabase'; // ✅ Importar Database

// ✅ Utilitzar el tipus 'Row' complet o un 'Pick' del 'Row'
//    Per ser més robustos, podem esperar el 'Row' complet
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Props {
    contacts: Contact[]; // ✅ Ara espera el tipus de la BD
    selectedId: number | null;
    onSelect: (contactId: number | null) => void;
    disabled?: boolean;
}

export const ContactSelector: FC<Props> = ({ 
    contacts, 
    selectedId, 
    onSelect, 
    disabled = false 
}) => {
    const t = useTranslations('OpportunityDialog');
    const [open, setOpen] = useState(false);

    const selectedContact = contacts.find(c => c.id === selectedId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="outline" 
                    role="combobox" 
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {/* ✅ Utilitzem 'nom' (el camp real) */}
                    {selectedContact ? selectedContact.nom : t('selectContactPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder={t('searchContactPlaceholder')} />
                    <CommandList>
                        <CommandEmpty>{t('noContactFound')}</CommandEmpty>
                        <CommandGroup>
                            <CommandItem onSelect={() => {
                                onSelect(null);
                                setOpen(false);
                            }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedId === null ? "opacity-100" : "opacity-0")} />
                                {t('noContact')}
                            </CommandItem>
                            {/* ✅ Això funcionarà quan 'contacts' no estigui buit */}
                            {contacts.map(contact => (
                                <CommandItem 
                                    key={contact.id} 
                                    value={contact.nom || ''} // El valor de cerca és 'nom'
                                    onSelect={() => {
                                        onSelect(contact.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedId === contact.id ? "opacity-100" : "opacity-0")} />
                                    {contact.nom}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};