// /src/components/features/contactes/ContactSelector.tsx (Refactoritzat)
"use client";

import { FC, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils/utils";
// ✅ 1. Importem el tipus directament des de la definició de la base de dades.
import { type Database } from '@/types/supabase';

// ✅ 2. Definim el tipus Contact només amb les propietats que aquest component necessita.
type Contact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'>;

interface Props {
    contacts: Contact[];
    // ✅ 3. L'ID seleccionat ara pot ser un número o null.
    selectedId: number | null;
    onSelect: (contactId: number | null) => void;
}

export const ContactSelector: FC<Props> = ({ contacts, selectedId, onSelect }) => {
    const t = useTranslations('OpportunityDialog');
    const [open, setOpen] = useState(false);

    // La lògica de trobar el contacte seleccionat funciona igual.
    const selectedContact = contacts.find(c => c.id === selectedId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
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
                            {/* Afegim una opció per desseleccionar */}
                            <CommandItem onSelect={() => {
                                onSelect(null);
                                setOpen(false);
                            }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedId === null ? "opacity-100" : "opacity-0")} />
                                {t('noContact')}
                            </CommandItem>
                            {contacts.map(contact => (
                                <CommandItem key={contact.id} value={contact.nom || ''} onSelect={() => {
                                    // ✅ 4. Passem l'ID numèric.
                                    onSelect(contact.id);
                                    setOpen(false);
                                }}>
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