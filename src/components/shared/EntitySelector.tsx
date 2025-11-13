// src/components/shared/EntitySelector.tsx (CORREGIT AMB LÒGICA 'UNCONTROLLED')
"use client";

// ✅ Importem useState i useMemo
import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// --- Interfícies ---

interface BaseItem {
    id: string | number;
}

interface EntitySelectorProps<T extends BaseItem> {
    // --- Props Controlades ---
    value?: T['id'] | null;
    onChange?: (id: T['id'] | null) => void;

    // ✅ --- Props NO Controlades (per a formularis) ---
    name?: string;
    defaultValue?: T['id'] | null;

    // --- Gestió de Dades ---
    items?: T[];
    searchAction?: (query: string) => Promise<T[]>;
    initialItem?: T | null;

    // --- Renderitzat i Textos ---
    getSearchValue: (item: T) => string;
    renderItem?: (item: T) => React.ReactNode;
    triggerPlaceholder: string;
    searchPlaceholder: string;
    emptySearchText: string;

    // --- Accions Addicionals ---
    allowClear?: boolean;
    clearText?: string;
    customActionItems?: React.ReactNode;

    // --- Altres ---
    disabled?: boolean;
    popoverContentClassName?: string;
}

export function EntitySelector<T extends BaseItem>({
    value: controlledValue, // Renombrem per claredat
    onChange: onControlledChange, // Renombrem per claredat
    name,
    defaultValue,
    items: staticItems,
    searchAction,
    initialItem: providedInitialItem, // Renombrem
    getSearchValue,
    renderItem,
    triggerPlaceholder,
    searchPlaceholder,
    emptySearchText,
    allowClear = false,
    clearText = "Netejar",
    customActionItems,
    disabled = false,
    popoverContentClassName,
}: EntitySelectorProps<T>) {

    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    // ✅ --- Lògica de "Controllable State" ---
    // 1. Determina si el component està en mode controlat
    const isControlled = controlledValue !== undefined;

    // 2. Estat intern (només s'usa si NO està controlat)
    const [internalValue, setInternalValue] = React.useState(defaultValue || null);

    // 3. Valor actual
    const value = isControlled ? controlledValue : internalValue;

    // 4. Funció 'onChange' unificada
    const handleSelect = (selectedId: T['id'] | null) => {
        // Si no és controlat, actualitza l'estat intern
        if (!isControlled) {
            setInternalValue(selectedId);
        }
        // Si el pare ha passat 'onChange', crida-la sempre
        if (onControlledChange) {
            onControlledChange(selectedId);
        }
        setOpen(false);
    };
    // --- Fi de la Lògica de "Controllable State" ---

    const [dynamicItems, setDynamicItems] = React.useState<T[]>(
        // Usem 'defaultValue' per carregar l'item inicial si és necessari
        providedInitialItem ? [providedInitialItem] : []
    );

    const isDynamicSearch = !!searchAction;

    React.useEffect(() => {
        if (!open || !isDynamicSearch) return;

        setIsLoading(true);
        const timer = setTimeout(async () => {
            if (!searchAction) return;
            const results = await searchAction(searchTerm);

            const currentSelectedItem = providedInitialItem && value === providedInitialItem.id ? providedInitialItem : null;
            if (currentSelectedItem && !results.find(r => r.id === currentSelectedItem.id)) {
                setDynamicItems([currentSelectedItem, ...results]);
            } else {
                setDynamicItems(results);
            }
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, open, isDynamicSearch, searchAction, providedInitialItem, value]);

    const itemsToShow = React.useMemo(() => {
        return isDynamicSearch ? dynamicItems : (staticItems || []);
    }, [isDynamicSearch, dynamicItems, staticItems]);

    const selectedEntity = React.useMemo(() => {
        if (value === null) return null;
        return itemsToShow.find(item => item.id === value) || providedInitialItem || null;
    }, [value, itemsToShow, providedInitialItem]);

    return (
        <> {/* ✅ Embolcallem amb un Fragment */}
            {/* ✅ AQUEST ÉS EL FIX PRINCIPAL PER A FORMULARIS */}
            {name && (
                <input
                    type="hidden"
                    name={name}
                    // Assegurem que el valor mai sigui 'null', sinó string buit
                    value={value === null ? "" : String(value)}
                />
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full", !selectedEntity && "text-muted-foreground")}
                        disabled={disabled}
                    >
                        <span className="flex items-center justify-between w-full">
                            <span className="truncate">
                                {selectedEntity
                                    ? String(getSearchValue(selectedEntity) || '')
                                    : triggerPlaceholder}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", popoverContentClassName)}>
                    <Command>
                        <CommandInput
                            placeholder={searchPlaceholder}
                            onValueChange={isDynamicSearch ? setSearchTerm : undefined}
                        />
                        <CommandList>
                            {(isLoading && isDynamicSearch) && (
                                <div className="flex items-center justify-center p-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {(!isLoading || !isDynamicSearch) && (
                                <CommandEmpty>{emptySearchText}</CommandEmpty>
                            )}

                            {customActionItems && (
                                <CommandGroup>
                                    {customActionItems}
                                </CommandGroup>
                            )}

                            {(allowClear || itemsToShow.length > 0) && (
                                <CommandGroup>
                                    {allowClear && (
                                        <CommandItem onSelect={() => handleSelect(null)}>
                                            <Check
                                                className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")}
                                            />
                                            {clearText}
                                        </CommandItem>
                                    )}
                                    {itemsToShow.map((item) => {
                                        const searchValue = String(getSearchValue(item) || '');
                                        return (
                                            <CommandItem
                                                key={item.id}
                                                value={searchValue}
                                                onSelect={() => handleSelect(item.id)}
                                            >
                                                <Check
                                                    className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")}
                                                />
                                                {renderItem ? renderItem(item) : searchValue}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    );
}