// /src/components/shared/SupplierCombobox.tsx (REFACTORITZAT)
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EntitySelector } from '@/components/shared/EntitySelector'; // ✅ Importem el genèric
import { type Supplier } from '@/types/finances/suppliers';
import { searchSuppliers } from "@/app/[locale]/(app)/finances/suppliers/actions";

// Tipus local
type MinimalSupplier = Pick<Supplier, 'id' | 'nom'>;

interface SupplierComboboxProps {
    value: string | null;
    onChange: (value: string | null) => void;
    initialSupplier: MinimalSupplier | null;
    disabled?: boolean;
}

export function SupplierCombobox({ 
    value, 
    onChange, 
    initialSupplier, 
    disabled 
}: SupplierComboboxProps) {
    const t = useTranslations('ExpenseDetailPage');

    return (
      <EntitySelector<MinimalSupplier>
        // --- Props del Selector ---
        value={value}
        onChange={onChange}
        disabled={disabled}
        initialItem={initialSupplier} // Passa l'item inicial
        
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