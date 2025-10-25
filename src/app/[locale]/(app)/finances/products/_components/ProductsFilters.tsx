// /app/[locale]/(app)/crm/products/_components/ProductsFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { type ProductPageFilters } from '../actions'; // Tipus de filtre

interface ProductsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: ProductPageFilters;
  onFilterChange: (key: keyof ProductPageFilters, value: string) => void;
  categories: string[];
}

export function ProductsFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  categories,
}: ProductsFiltersProps) {
  const t = useTranslations('ProductsPage'); // O un namespace específic de filtres

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={t('searchPlaceholder') || "Busca per nom..."}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs h-9 bg-card border border-input"
      />
      <Select
        value={filters.category}
        onValueChange={(value) => onFilterChange('category', value)}
      >
        <SelectTrigger className="w-[180px] h-9 bg-card border border-input">
          <SelectValue placeholder={t('categoryFilterPlaceholder') || "Totes les categories"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allCategories') || "Totes les categories"}</SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}