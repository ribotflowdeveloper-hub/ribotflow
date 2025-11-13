// /src/components/shared/SupplierCombobox.tsx (REFACTORITZAT)
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EntitySelector } from '@/components/shared/EntitySelector'; // ✅ Importem el genèric
import { type Supplier } from '@/types/finances/suppliers';
import { searchSuppliers } from "@/app/[locale]/(app)/finances/suppliers/actions";

// Tipus local
type MinimalSupplier = Pick<Supplier, 'id' | 'nom'>;

// ✅ CORRECCIÓ: Afegim 'name' i 'defaultValue' a les props
interface SupplierComboboxProps {
    value?: string | null; // És opcional si s'usa 'defaultValue'
    onChange?: (value: string | null) => void; // És opcional si s'usa 'name'
    name?: string;
    defaultValue?: string | null;
    initialSupplier: MinimalSupplier | null;
    disabled?: boolean;
}

export function SupplierCombobox({ 
    value, 
    onChange, 
    name, 
    defaultValue, 
    initialSupplier, 
    disabled 
}: SupplierComboboxProps) {
    const t = useTranslations('ExpenseDetailPage');

    return (
      <EntitySelector<MinimalSupplier>
        // --- Props del Selector (Controlades i No Controlades) ---
        value={value}
        onChange={onChange}
        name={name} // ✅ Passat a EntitySelector
        defaultValue={defaultValue} // ✅ Passat a EntitySelector
        disabled={disabled}
        initialItem={initialSupplier}
        
        // --- Gestió de Dades (Dinàmica) ---
        searchAction={searchSuppliers}
        
        // --- Renderitzat i Textos ---
        getSearchValue={(supplier) => supplier.nom}
        triggerPlaceholder={t('select.selectSupplier')}
        searchPlaceholder={t('select.searchSupplier')}
        emptySearchText={t('select.noSupplierFound')}
        
        // --- Accions Addicionals ---
        allowClear={true}
        clearText={t('select.noSupplier')}
      />
    );
}