// src/app/[locale]/(app)/finances/suppliers/_components/SuppliersFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
// ❗ Eliminem import innecessari: import { type SupplierPageFilters } from '../actions';

// ✅ CORRECCIÓ TS: Eliminem 'filters' i 'onFilterChange' de les props
interface SuppliersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  // categories?: string[]; // Si tinguessis categories
}

export function SuppliersFilters({
  searchTerm,
  onSearchChange,
}: SuppliersFiltersProps) {
  const t = useTranslations('SuppliersPage');

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={t('searchPlaceholder') || "Busca per nom, NIF o email..."}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs h-9 bg-card border border-input"
      />
      {/* Aquí anirien Selects si tinguessis filtres addicionals */}
    </div>
  );
}