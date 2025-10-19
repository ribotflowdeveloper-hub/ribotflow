"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Supplier } from '@/types/finances/suppliers';
import { useTranslations } from "next-intl";
import { searchSuppliers } from "@/app/[locale]/(app)/finances/proveidors/actions"; // <-- ✅ Ara funciona

interface SupplierComboboxProps {
    value: string | null;
    onChange: (value: string | null) => void;
    initialSupplier: Pick<Supplier, 'id' | 'nom'> | null;
    disabled?: boolean;
}

export function SupplierCombobox({ value, onChange, initialSupplier, disabled }: SupplierComboboxProps) {
    const t = useTranslations('ExpenseDetailPage');
    const [open, setOpen] = React.useState(false);
    
    // Llista de proveïdors trobats en la cerca
    const [suppliers, setSuppliers] = React.useState<Pick<Supplier, 'id' | 'nom'>[]>(
        initialSupplier ? [initialSupplier] : []
    );
    
    // El proveïdor seleccionat (objecte)
    const selectedSupplier = suppliers.find(s => s.id === value) || null;
    
    const [searchTerm, setSearchTerm] = React.useState("");

    // Cerca asíncrona
    React.useEffect(() => {
        if (!open) return;

        const fetchSuppliers = async () => {
            // Crida a la Server Action
            const results = await searchSuppliers(searchTerm); // ✅ Aquesta acció ara existeix
            
            // Assegurem que el proveïdor inicial (si està seleccionat) es mantingui a la llista
            // per si la cerca nova no el retorna.
            if (initialSupplier && !results.find(s => s.id === initialSupplier.id)) {
                 setSuppliers([initialSupplier, ...results]);
            } else {
                 setSuppliers(results);
            }
        };
        
        // Un petit debounce
        const timer = setTimeout(fetchSuppliers, 300);
        return () => clearTimeout(timer);

    }, [searchTerm, open, initialSupplier]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {selectedSupplier
                        ? selectedSupplier.nom
                        : t('select.selectSupplier')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput 
                        placeholder={t('select.searchSupplier')}
                        onValueChange={setSearchTerm}
                    />
                    <CommandList>
                        <CommandEmpty>{t('select.noSupplierFound')}</CommandEmpty>
                        <CommandGroup>
                            {/* Opció per netejar */}
                            <CommandItem
                                onSelect={() => {
                                    onChange(null);
                                    setOpen(false);
                                }}
                            >
                                {t('select.noSupplier')}
                            </CommandItem>
                            
                            {suppliers.map((supplier) => (
                                <CommandItem
                                    key={supplier.id}
                                    value={supplier.nom} // Cerquem per nom
                                    onSelect={() => {
                                        // ✅ Canvi: .toString() eliminat. 'supplier.id' ja és string (uuid)
                                        onChange(supplier.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === supplier.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {supplier.nom}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}