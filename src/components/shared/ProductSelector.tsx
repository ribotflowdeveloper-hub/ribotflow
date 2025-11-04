// /src/components/shared/ProductSelector.tsx (COMPLET I CORREGIT)
"use client";

// ✅ Importem 'useRef' per al fix del bucle i 'Textarea' per a la millora
import React, { useState, useEffect, useRef } from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // 👈 Importat!
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, BookPlus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Database } from '@/types/supabase';

// L'IMPORT CORREGIT A L'ACCIÓ QUE HAS PROPORCIONAT
import { createProduct } from '@/app/[locale]/(app)/finances/products/actions';
// ✅ 2. Importem els tipus NOMÉS PER A ÚS INTERN
import type {

    FormState,


} from '@/lib/services/finances/products/products.service';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductSelectorProps {
    products: Product[];
    onProductSelect: (product: Product) => void;
    onManualAdd: () => void;
    /** Funció de traducció (t) amb el namespace ja aplicat. */
    t: (key: string) => string;
    /** Opcional: Permet personalitzar el botó que obre el Popover */
    triggerButton?: React.ReactNode;
}

// Estat inicial per useActionState
const initialState: FormState = {
    success: false,
    message: '',
    errors: {},
};

// ✅ 2. Hook personalitzat per obtenir el valor anterior (CORREGIT)
function usePrevious<T>(value: T): T | undefined {
    // ✅ CORRECCIÓ: Inicialitzem el ref amb 'undefined'
    const ref = useRef<T | undefined>(undefined);

    // Guardem el valor actual (que és el previ abans de l'actualització de l'efecte)
    const previous = ref.current;

    useEffect(() => {
        // Actualitzem el ref amb el nou valor *després* del render
        ref.current = value;
    }, [value]);

    // Retornem el valor que teníem abans de l'actualització de l'efecte
    return previous;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
    products,
    onProductSelect,
    onManualAdd,
    t,
    triggerButton
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Nou hook per gestionar l'estat del formulari
    const [formState, formAction, isPending] = useActionState(createProduct, initialState);

    // ✅ 3. Obtenim l'estat anterior (aquesta lògica és correcta)
    const prevFormState = usePrevious(formState);

    // ✅ 4. useEffect modificat (aquesta lògica és correcta)
    useEffect(() => {
        // Si l'estat actual és el mateix que l'anterior, sortim d'hora.
        if (prevFormState === formState) {
            return;
        }

        // La lògica només s'executa quan formState REALMENT canvia
        if (formState.success && formState.data) {
            toast.success(t('toast.productCreated'), { description: formState.message });

            // 1. Cridem el callback del pare amb el nou producte
            onProductSelect(formState.data as Product);

            // 2. Resetejem l'estat i tanquem el popover
            setIsCreating(false);
            setIsPopoverOpen(false);

        } else if (!formState.success && (formState.message || formState.errors) && formState.message !== '') {
            // Si hi ha un error de validació o de servidor
            const description = formState.errors
                ? Object.values(formState.errors).flat().join(' ')
                : t('toast.genericError');
            toast.error(formState.message || "Error", { description });
        }

    }, [formState, prevFormState, onProductSelect, t]); // Dependències completes


    const handleManualItemClick = () => {
        onManualAdd();
        setIsPopoverOpen(false);
    };

    const handleProductSelectClick = (product: Product) => {
        onProductSelect(product);
        setIsPopoverOpen(false);
    };

    // Component 'SubmitButton' intern per gestionar l'estat 'pending'
    const SubmitButton = () => {
        return (
            <Button size="sm" type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('saveAndAddButton')}
            </Button>
        );
    }

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                {triggerButton ? triggerButton : (
                    <Button variant="outline" size="sm" className="mt-4">
                        <BookPlus className="w-4 h-4 mr-2" />
                        {t('addButton')}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0">
                {isCreating ? (
                    // Convertit a un <form> que crida la Server Action
                    <form action={formAction}>
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">{t('newProductTitle')}</p>

                            {/* Camp Nom (obligatori) */}
                            <div>
                                <Input
                                    name="name" // Coincideix amb el schema
                                    placeholder={t('newProductNamePlaceholder')}
                                    required
                                />
                                {formState.errors?.name && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.name.join(', ')}</p>
                                )}
                            </div>

                            {/* ✅ MILLORA: Camp Descripció (opcional) */}
                            <div>
                                <Textarea
                                    name="description" // Coincideix amb el schema (opcional)
                                    placeholder={t('newProductDescPlaceholder')} // Hauràs d'afegir aquesta traducció!
                                    rows={3}
                                    className="text-sm"
                                />
                                {formState.errors?.description && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.description.join(', ')}</p>
                                )}
                            </div>
                            {/* ✅ FI DE LA MILLORA */}

                            {/* Camp Preu (obligatori) */}
                            <div>
                                <Input
                                    name="price" // Coincideix amb el schema
                                    type="number"
                                    placeholder={t('newProductPricePlaceholder')}
                                    step="0.01"
                                    required
                                />
                                {formState.errors?.price && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.price.join(', ')}</p>
                                )}
                            </div>

                            {/* Camp ocult 'is_active' */}
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

                            {/* GRUP 1: ACCIONS */}
                            <CommandGroup>
                                <CommandItem
                                    onSelect={handleManualItemClick}
                                    className="bg-gray-600 text-card"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>{t('addManualItem')}</span>
                                </CommandItem>
                                <p className="py-1"></p>
                                <CommandItem
                                    onSelect={() => setIsCreating(true)}
                                    className="bg-gray-600 text-card"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    <span>{t('createNewItem')}</span>
                                </CommandItem>
                            </CommandGroup>

                            {/* GRUP 2: LLISTA DE PRODUCTES */}
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