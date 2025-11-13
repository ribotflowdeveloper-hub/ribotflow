// src/components/shared/EntitySelector.tsx (CORREGIT PEL RUNTIME ERROR)
"use client";

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

// --- Interfícies (Sense canvis) ---
interface BaseItem {
    id: string | number;
}
interface EntitySelectorProps<T extends BaseItem> {
    value: T['id'] | null;
    onChange: (id: T['id'] | null) => void;
    items?: T[];
    searchAction?: (query: string) => Promise<T[]>;
    initialItem?: T | null;
    getSearchValue: (item: T) => string;
    renderItem?: (item: T) => React.ReactNode;
    triggerPlaceholder: string;
    searchPlaceholder: string;
    emptySearchText: string;
    allowClear?: boolean;
    clearText?: string;
    customActionItems?: React.ReactNode;
    disabled?: boolean;
    popoverContentClassName?: string;
}

export function EntitySelector<T extends BaseItem>({
    value,
    onChange,
    items: staticItems,
    searchAction,
    initialItem,
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

    const [dynamicItems, setDynamicItems] = React.useState<T[]>(
        initialItem ? [initialItem] : []
    );

    const isDynamicSearch = !!searchAction;

    // ... (useEffect de cerca dinàmica es manté igual) ...
    React.useEffect(() => {
        if (!open || !isDynamicSearch) return;

        setIsLoading(true);
        const timer = setTimeout(async () => {
            const results = await searchAction(searchTerm);

            const currentSelectedItem = initialItem && value === initialItem.id ? initialItem : null;
            if (currentSelectedItem && !results.find(r => r.id === currentSelectedItem.id)) {
                setDynamicItems([currentSelectedItem, ...results]);
            } else {
                setDynamicItems(results);
            }
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, open, isDynamicSearch, searchAction, initialItem, value]);

    // ... (useMemo per a itemsToShow es manté igual) ...
    const itemsToShow = React.useMemo(() => {
        return isDynamicSearch ? dynamicItems : (staticItems || []);
    }, [isDynamicSearch, dynamicItems, staticItems]);

    // ... (useMemo per a selectedEntity es manté igual) ...
    const selectedEntity = React.useMemo(() => {
        if (value === null) return null;
        return itemsToShow.find(item => item.id === value) || initialItem || null;
    }, [value, itemsToShow, initialItem]);

    const handleSelect = (selectedId: T['id'] | null) => {
        onChange(selectedId);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    // ✅ CORRECCIÓ: Treiem 'justify-between' del botó
                    className="w-full"
                    disabled={disabled}
                >
                    {/* ✅ CORRECCIÓ: Embolcallem tot en un sol <span> */}
                    <span className="flex items-center justify-between w-full">
                        <span className="truncate"> {/* Afegim truncate per noms llargs */}
                            {selectedEntity
                                // ✅ Assegurem que el fill sigui sempre un string
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
                                    // ✅ També m'asseguro que getSearchValue retorni un string per al 'value' del CommandItem
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
    );
}