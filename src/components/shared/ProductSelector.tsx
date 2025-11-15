"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, BookPlus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Database } from '@/types/supabase';

// ✅ 1. CORRECCIÓ DE RUTA: Aquestes accions i tipus viuen a 'products', no a 'services'.
import { createProduct } from '@/app/[locale]/(app)/finances/products/actions';
import type {
    FormState,
} from '@/lib/services/finances/products/products.service';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductSelectorProps {
    products: Product[];
    onProductSelect: (product: Product) => void;
    onManualAdd: () => void;
    t: (key: string) => string;
    // ✅ 2. CORRECCIÓ DE TIPUS: Ha de ser 'ReactElement' (un component) no 'ReactNode' (que pot ser text)
    triggerButton?: React.ReactElement;
    disabled?: boolean;
}

// ✅ 3. CORRECCIÓ: 'initialState' (basat en el teu 'products.service' que no veig, però 'success' no hi va)
const initialState: FormState = {
    success: false,
    message: '',
    errors: {},
};

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);
    const previous = ref.current;
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return previous;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
    products,
    onProductSelect,
    onManualAdd,
    t,
    triggerButton,
    disabled,
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const [formState, formAction, isPending] = useActionState(createProduct, initialState);

    const prevFormState = usePrevious(formState);

    useEffect(() => {
        if (prevFormState === formState) return;

        // ✅ 4. CORRECCIÓ: Comprovem si 'data' existeix per saber si hi ha hagut èxit
        if (formState.data) {
            toast.success(t('toast.productCreated'), { description: formState.message });
            onProductSelect(formState.data as Product);
            setIsCreating(false);
            setIsPopoverOpen(false);
        } else if (formState.message || formState.errors) {
            const description = formState.errors
                ? Object.values(formState.errors).flat().join(' ')
                : t('toast.genericError');
            toast.error(formState.message || "Error", { description });
        }
    }, [formState, prevFormState, onProductSelect, t]);

    const handleManualItemClick = () => {
        onManualAdd();
        setIsPopoverOpen(false);
    };

    const handleProductSelectClick = (product: Product) => {
        onProductSelect(product);
        setIsPopoverOpen(false);
    };

    const SubmitButton = () => (
        <Button size="sm" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('saveAndAddButton')}
        </Button>
    );

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                {triggerButton ? (
                    // ✅ SOLUCIÓ: 
                    // Especifiquem que el component que clonem accepta 'disabled'
                    React.cloneElement(
                        triggerButton as React.ReactElement<{ disabled?: boolean }>,
                        { disabled: disabled || isPending }
                    )
                ) : (
                    <Button variant="outline" size="sm" className="mt-4" disabled={disabled || isPending}>
                        <BookPlus className="w-4 h-4 mr-2" />
                        {t('addButton')}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0">
                {isCreating ? (
                    <form action={formAction}>
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">{t('newProductTitle')}</p>
                            <div>
                                <Input name="name" placeholder={t('newProductNamePlaceholder')} required />
                                {formState.errors?.name && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.name.join(', ')}</p>
                                )}
                            </div>
                            <div>
                                <Textarea name="description" placeholder={t('newProductDescPlaceholder')} rows={3} className="text-sm" />
                            </div>
                            <div>
                                <Input name="price" type="number" placeholder={t('newProductPricePlaceholder')} step="0.01" required />
                                {formState.errors?.price && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.price.join(', ')}</p>
                                )}
                            </div>
                            {/* Pots afegir el camp 'sku' aquí si vols que es pugui crear */}
                            {/* <div>
                                <Input name="sku" placeholder={t('newProductSkuPlaceholder')} />
                            </div>
                            */}
                            <input type="hidden" name="is_active" value="on" />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreating(false)}>{t('cancelButton')}</Button>
                                <SubmitButton />
                            </div>
                        </div>
                    </form>
                ) : (
                    <Command>
                        <CommandInput placeholder={t('searchPlaceholder')} />
                        <CommandList>
                            <CommandEmpty>{t('emptySearch')}</CommandEmpty>
                            <CommandGroup>
                                <CommandItem onSelect={handleManualItemClick} className="text-muted-foreground">
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>{t('addManualItem')}</span>
                                </CommandItem>
                                <CommandItem onSelect={() => setIsCreating(true)}>
                                    <Save className="mr-2 h-4 w-4" />
                                    <span>{t('createNewItem')}</span>
                                </CommandItem>
                            </CommandGroup>
                            <CommandGroup>
                                {products.map((product) => (
                                    <CommandItem key={product.id} value={product.name} onSelect={() => handleProductSelectClick(product)}>
                                        <div className="flex justify-between w-full">
                                            <span>{product.name}</span>
                                            <span className="text-muted-foreground">€{product.price}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                )}
            </PopoverContent>
        </Popover>
    );
};