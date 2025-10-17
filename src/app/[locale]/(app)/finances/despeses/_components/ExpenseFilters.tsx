// src/app/[locale]/(app)/finances/despeses/_components/ExpenseFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useTranslations } from 'next-intl';
interface ExpenseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

export function ExpenseFilters({
  searchTerm,
  onSearchChange,
  status,
  onStatusChange,
}: ExpenseFiltersProps) {
  // Aquesta llista de categories podria venir com a prop des del servidor
  const t = useTranslations('ExpensesPage');
  const statuses = ['pending', 'paid', 'overdue', 'cancelled'];

  return (
    <div className="mb-4 flex items-center space-x-4">
      <Input
        placeholder="Busca per descripció o proveïdor..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      {/* ✅ NOU: Select per a l'estat */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('filter.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
          {statuses.map(s => (
            <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}