// src/app/[locale]/(app)/finances/despeses/_components/ExpenseFilters.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExpenseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  // Pots afegir més filtres aquí
  // per exemple: allCategories: string[]
}

export function ExpenseFilters({
  searchTerm,
  onSearchChange,
  category,
  onCategoryChange,
}: ExpenseFiltersProps) {
  // Aquesta llista de categories podria venir com a prop des del servidor
  const categories = ["Material", "Software", "Lloguer", "Serveis", "Altres"];

  return (
    <div className="mb-4 flex items-center space-x-4">
      <Input
        placeholder="Busca per descripció o proveïdor..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Totes les categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Totes les categories</SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}