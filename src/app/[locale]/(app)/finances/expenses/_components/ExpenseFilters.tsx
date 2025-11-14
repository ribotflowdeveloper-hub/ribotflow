// src/app/[locale]/(app)/finances/expenses/_components/ExpenseFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from 'next-intl';
import { Search } from "lucide-react";
import { type ExpenseCategory } from "@/types/finances/index"; // ✅ AFEGIR

export interface ExpensePageFilters {
  category: string; // 'all' o un UUID
  status: string;
}

interface ExpenseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: ExpensePageFilters;
  onFilterChange: (key: keyof ExpensePageFilters, value: string) => void;
  categories: ExpenseCategory[]; // 👈 CANVIAT: Ara és un array d'objectes
}

export function ExpenseFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  categories,
}: ExpenseFiltersProps) {
  const t = useTranslations('ExpensesPage');
  const statuses = ['pending', 'paid', 'overdue', 'cancelled'];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full mb-2">
      {/* 🔹 Filtres d'estat i categoria */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:overflow-visible">
        {/* Estat */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger className="min-w-[120px] sm:w-[150px] h-9 bg-card border border-input text-sm">
            <SelectValue placeholder={t('filter.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ✅ Categoria (MODIFICAT) */}
        <Select
          value={filters.category}
          onValueChange={(value) => onFilterChange('category', value)}
        >
          <SelectTrigger className="min-w-[120px] sm:w-[150px] h-9 bg-card border border-input text-sm">
            <SelectValue placeholder={t('filter.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allCategories')}</SelectItem>
            {categories.map(c => (
              // El 'value' ara és l'ID (UUID), el text és el 'name'
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🔹 Buscador */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('filter.searchPlaceholder') || "Busca..."}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 w-full h-9 text-sm bg-card border border-input"
        />
      </div>
    </div>
  );
}