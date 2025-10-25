// src/app/[locale]/(app)/finances/expenses/_components/ExpenseFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from 'next-intl';

export interface ExpensePageFilters {
  category: string;
  status: string;
}

interface ExpenseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: ExpensePageFilters;
  onFilterChange: (key: keyof ExpensePageFilters, value: string) => void;
  categories: string[];
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
    // ✅ Canviem a flex (sense wrap per defecte) i ajustem el gap
    <div className="flex items-center gap-2"> {/* Abans: mb-4 flex flex-wrap items-center gap-4 */}
      <Input
        placeholder={t('filter.searchPlaceholder') || "Busca..."}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        // ✅ Afegim fons i vora
        className="max-w-xs h-9 bg-card border border-input" />

      {/* Filtre d'Estat */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFilterChange('status', value)}
      >
        {/* ✅ Afegim fons i vora al trigger */}
        <SelectTrigger className="w-[160px] h-9 bg-card border border-input">
          <SelectValue placeholder={t('filter.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
          {statuses.map(s => (
            <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre de Categoria */}
      <Select
        value={filters.category}
        onValueChange={(value) => onFilterChange('category', value)}
      >
        {/* ✅ Afegim fons i vora al trigger */}
        <SelectTrigger className="w-[160px] h-9 bg-card border border-input">
          <SelectValue placeholder={t('filter.allCategories')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filter.allCategories')}</SelectItem>
          {categories.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}