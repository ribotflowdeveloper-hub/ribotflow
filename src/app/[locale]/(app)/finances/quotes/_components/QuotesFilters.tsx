// /app/[locale]/(app)/crm/quotes/_components/QuotesFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
// ✅ Importem QuoteStatus aquí, ja que sí s'usa per al tipus de filtre
import { type QuoteStatus, type QuotePageFilters } from '../actions';

// ✅ CORRECCIÓ: Valors amb majúscula inicial per coincidir amb l'enum
const statusOptions: { value: QuoteStatus | 'all', labelKey: string }[] = [
   { value: 'all', labelKey: 'allStatuses' },
   { value: 'Draft', labelKey: 'status.Draft' }, // <-- Majúscula
   { value: 'Sent', labelKey: 'status.Sent' },   // <-- Majúscula
   { value: 'Accepted', labelKey: 'status.Accepted' }, // <-- Majúscula
   { value: 'Declined', labelKey: 'status.Declined' }, // <-- Majúscula
   { value: 'Invoiced', labelKey: 'status.Invoiced' }, // <-- Majúscula
];

// ✅ CORRECCIÓ TS: Ajustem el tipus de 'onFilterChange'
interface QuotesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: QuotePageFilters;
  // Ara espera el tipus exacte que prové del hook usePaginatedResource
  onFilterChange: <K extends keyof QuotePageFilters>(key: K, value: QuotePageFilters[K]) => void;
  // clients?: { id: number; nom: string | null }[];
}

export function QuotesFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  // clients = [],
}: QuotesFiltersProps) {
  const t = useTranslations('QuotesPage.filters');
  const tStatus = useTranslations('QuotesPage'); // Ajusta si cal

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={t('searchPlaceholder') || "Busca nº o client..."}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs h-9 bg-card border border-input"
      />

      <Select
        value={filters.status}
        // Passem el valor directament. L'assertion 'as' assegura la compatibilitat
        onValueChange={(value) => onFilterChange('status', value as QuoteStatus | 'all')} // <-- Assertion de tipus aquí
      >
        <SelectTrigger className="w-[160px] h-9 bg-card border border-input">
          <SelectValue placeholder={t('statusPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {/* Ajusta el namespace si les traduccions d'estat estan a Shared */}
              {tStatus(`status.${option.value}`, {})}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Aquí aniria el filtre per client si l'implementes */}
    </div>
  );
}