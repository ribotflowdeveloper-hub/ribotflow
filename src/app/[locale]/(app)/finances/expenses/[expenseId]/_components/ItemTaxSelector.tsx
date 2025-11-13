// src/app/[locale]/(app)/finances/expenses/[expenseId]/_components/ItemTaxSelector.tsx
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,

} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { type TaxRate } from '@/types/finances/expenses';

interface ItemTaxSelectorProps {
  availableTaxes: TaxRate[];
  selectedTaxes: TaxRate[];
  onChange: (newTaxes: TaxRate[]) => void;
  disabled?: boolean;
}

export function ItemTaxSelector({
  availableTaxes,
  selectedTaxes,
  onChange,
  disabled,
}: ItemTaxSelectorProps) {
  const t = useTranslations('ExpenseDetailPage.items');
  const [open, setOpen] = React.useState(false);

  const handleSelect = (tax: TaxRate) => {
    const isSelected = selectedTaxes.some((t) => t.id === tax.id);
    let newSelection: TaxRate[];
    if (isSelected) {
      newSelection = selectedTaxes.filter((t) => t.id !== tax.id);
    } else {
      newSelection = [...selectedTaxes, tax];
    }
    onChange(newSelection);
  };

  const getButtonLabel = () => {
    if (selectedTaxes.length === 0) {
      return t('addTax') || 'Afegir impost';
    }
    if (selectedTaxes.length === 1) {
      return selectedTaxes[0].name;
    }
    return t('multipleTaxes', { count: selectedTaxes.length }) || `${selectedTaxes.length} impostos`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-xs"
          disabled={disabled}
        >
          <span className="truncate">{getButtonLabel()}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder={t('searchTax') || 'Buscar impost...'} />
          <CommandList>
            <CommandEmpty>{t('noTaxFound') || 'No s\'ha trobat cap impost.'}</CommandEmpty>
            <CommandGroup>
              {availableTaxes.map((tax) => {
                const isSelected = selectedTaxes.some((t) => t.id === tax.id);
                return (
                  <CommandItem
                    key={tax.id}
                    value={tax.name}
                    onSelect={() => handleSelect(tax)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1">{tax.name}</span>
                    <Badge 
                      variant={tax.type === 'retention' ? 'destructive' : 'secondary'}
                      className="ml-2"
                    >
                      {tax.type === 'retention' ? '-' : '+'}
                      {tax.rate}%
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}