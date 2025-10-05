import { FC, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils/utils";
import type { Contact } from '../page';

interface Props {
    contacts: Contact[];
    selectedId: string;
    onSelect: (contactId: string) => void;
}

export const ContactSelector: FC<Props> = ({ contacts, selectedId, onSelect }) => {
    const t = useTranslations('OpportunityDialog');
    const [open, setOpen] = useState(false);

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
                            {contacts.map(contact => (
                                <CommandItem key={contact.id} value={contact.nom} onSelect={() => {
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