"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Supplier } from '@/types/finances/suppliers';
import { useTranslations } from "next-intl";
// ✅ Assegura't que la ruta d'importació ara apunta a la nova ubicació (suppliers)
import { searchSuppliers } from "@/app/[locale]/(app)/finances/suppliers/actions"; 

interface SupplierComboboxProps {
    // ✅ Props per a Formularis NO CONTROLATS (com el de contactes)
    name?: string; // Per al camp 'hidden' que recollirà FormData
    defaultValue?: string | null; // El valor inicial (supplier_id)

    // ✅ Props per a Formularis CONTROLATS (com el de despeses)
    value?: string | null;
    onChange?: (value: string | null) => void;
    
    // Props generals
    initialSupplier: Pick<Supplier, 'id' | 'nom'> | null;
    disabled?: boolean;
}

export function SupplierCombobox({ 
    name, 
    defaultValue, 
    value: controlledValue, 
    onChange: controlledOnChange, 
    initialSupplier, 
    disabled 
}: SupplierComboboxProps) {
    
    const t = useTranslations('ExpenseDetailPage'); // Pots canviar el context de traducció si vols
    const [open, setOpen] = React.useState(false);
    
    // --- Lògica d'estat (Controlat vs. No Controlat) ---
    // Si 'defaultValue' existeix, el component gestiona el seu propi estat (no controlat)
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? null);
    
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;
    
    const setValue = (newValue: string | null) => {
        if (isControlled) {
            controlledOnChange?.(newValue);
        } else {
            setInternalValue(newValue);
        }
    };
    // --- Fi Lògica d'estat ---

    const [suppliers, setSuppliers] = React.useState<Pick<Supplier, 'id' | 'nom'>[]>(
        initialSupplier ? [initialSupplier] : []
    );
    
    // Troba el proveïdor seleccionat (objecte)
    const selectedSupplier = suppliers.find(s => s.id === value) || null;
    
    const [searchTerm, setSearchTerm] = React.useState(initialSupplier?.nom ?? "");

    // Cerca asíncrona (es queda igual que abans)
    React.useEffect(() => {
        if (!open) return;
        const fetchSuppliers = async () => {
            const results = await searchSuppliers(searchTerm);
            if (initialSupplier && !results.find(s => s.id === initialSupplier.id)) {
                 setSuppliers([initialSupplier, ...results]);
            } else {
                 setSuppliers(results);
            }
        };
        const timer = setTimeout(fetchSuppliers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, open, initialSupplier]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            
            {/* ✅ AQUESTA ÉS LA PART CLAU PER A FormData */}
            {/* Un camp ocult que desa l'ID seleccionat. El <form> el llegirà. */}
            {name && (
                <input 
                    type="hidden" 
                    name={name} 
                    value={value ?? ""} 
                />
            )}

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
                            <CommandItem
                                onSelect={() => {
                                    setValue(null); // Utilitzem el nostre 'setValue'
                                    setOpen(false);
                                }}
                            >
                                {t('select.noSupplier')}
                            </CommandItem>
                            
                            {suppliers.map((supplier) => (
                                <CommandItem
                                    key={supplier.id}
                                    value={supplier.nom}
                                    onSelect={() => {
                                        setValue(supplier.id); // Utilitzem el nostre 'setValue'
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