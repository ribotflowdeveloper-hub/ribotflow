// /src/components/shared/ProductSelector.tsx (REFACTORITZAT)
"use client";

// ✅ Importem 'useActionState' (el nou 'useFormState' a React 19)
// Si fas servir una versió anterior de Next/React, importa 'useFormState'
import React, { useState, useEffect } from 'react';
import { useActionState } from 'react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, BookPlus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Database } from '@/types/supabase';

// ✅✅✅
// L'IMPORT CORREGIT A L'ACCIÓ QUE HAS PROPORCIONAT
// Ajusta la ruta si no és exactament aquesta (ex: treure [locale])
import { 
    createProduct, 
    type FormState as ProductFormState // Importem l'acció i el seu tipus de retorn
} from '@/app/[locale]/(app)/finances/products/actions'; 
// ✅✅✅

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
const initialState: ProductFormState = {
    success: false,
    message: '',
    errors: {},
};

export const ProductSelector: React.FC<ProductSelectorProps> = ({
    products,
    onProductSelect,
    onManualAdd,
    t,
    triggerButton
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // ✅ Nou hook per gestionar l'estat del formulari
    // El 'isPending' ens diu si l'acció s'està executant
    const [formState, formAction, isPending] = useActionState(createProduct, initialState);

    // ✅ useEffect per reaccionar al resultat de l'acció
    useEffect(() => {
        // Quan el formulari es processa amb èxit...
        if (formState.success && formState.data) {
            toast.success(t('toast.productCreated'), { description: formState.message });
            
            // 1. Cridem el callback del pare amb el nou producte
            onProductSelect(formState.data as Product);
            
            // 2. Resetejem l'estat i tanquem el popover
            setIsCreating(false);
            setIsPopoverOpen(false);
            // L'estat 'formState' es resetejarà sol en la propera crida

        } else if (!formState.success && (formState.message || formState.errors) && formState.message !== '') {
            // Si hi ha un error de validació o de servidor
            const description = formState.errors 
                ? Object.values(formState.errors).flat().join(' ') 
                : t('toast.genericError');
            toast.error(formState.message || "Error", { description });
        }
    }, [formState, onProductSelect, t]); // Reaccionem als canvis de formState


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
                    // ✅ Convertit a un <form> que crida la Server Action
                    <form action={formAction}>
                        <div className="p-4 space-y-2">
                            <p className="font-medium text-sm">{t('newProductTitle')}</p>
                            
                            {/* ✅ Els camps ara tenen 'name' per a FormData.
                                Aquests 'name' han de coincidir amb els del 'productSchema'
                            */}
                            <div>
                                <Input 
                                    name="name" // ✅ Coincideix amb el schema
                                    placeholder={t('newProductNamePlaceholder')} 
                                    required 
                                />
                                {formState.errors?.name && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.name.join(', ')}</p>
                                )}
                            </div>

                            <div>
                                <Input 
                                    name="price" // ✅ Coincideix amb el schema
                                    type="number" 
                                    placeholder={t('newProductPricePlaceholder')} 
                                    step="0.01"
                                    required 
                                />
                                {formState.errors?.price && (
                                    <p className="text-xs text-destructive pt-1">{formState.errors.price.join(', ')}</p>
                                )}
                            </div>
                            
                            {/* ❗ Important: La teva acció 'createProduct' valida 'is_active'.
                                L'afegim com a camp ocult, assumint que un producte 
                                creat des d'aquí sempre ha d'estar actiu.
                            */}
                            <input type="hidden" name="is_active" value="on" />
                            
                            {/* ⚠️ ATENCIÓ: Si el teu 'productSchema' té altres camps obligatoris
                                (com 'description', 'category', etc.), has d'afegir-los aquí
                                o la validació de Zod fallarà. Si són opcionals, no cal.
                            */}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreating(false)}>{t('cancelButton')}</Button>
                                <SubmitButton />
                            </div>
                        </div>
                    </form>
                ) : (
                    <Command>
                        <CommandInput placeholder={t('searchPlaceholder')} />
                       {/* ✅ Aquí comencen els canvis */}
                        <CommandList>
                            <CommandEmpty>{t('emptySearch')}</CommandEmpty>
                            
                            {/* GRUP 1: ACCIONS */}
                            <CommandGroup>
                                <CommandItem 
                                    onSelect={handleManualItemClick}

                                    className="bg-gray-600 text-card" // ✅ AFEGIT: mateix estil
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>{t('addManualItem')}</span>
                                </CommandItem>
                                <p className="py-1"></p>
                                <CommandItem 
                                    onSelect={() => setIsCreating(true)}
                                    className="bg-gray-600 text-card" // ✅ AFEGIT: mateix estil
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    <span>{t('createNewItem')}</span>
                                </CommandItem>
                            </CommandGroup>
                            
                            {/* GRUP 2: LLISTA DE PRODUCTES */}
                            {/* Afegim un títol al grup si hi ha productes */}
                            <CommandGroup 
                        
                            >
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