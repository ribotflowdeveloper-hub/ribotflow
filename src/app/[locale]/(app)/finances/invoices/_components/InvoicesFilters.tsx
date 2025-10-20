// src/app/[locale]/(app)/finances/invoices/_components/InvoiceFilters.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
// Importa el mapa d'estats per omplir el selector
import { INVOICE_STATUS_MAP, type InvoiceStatus } from "@/types/finances/invoices";

interface InvoiceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  status: InvoiceStatus | 'all';
  onStatusChange: (value: string) => void; // El Select retorna string
  // Podries afegir filtre per client aquí
  // clientId: string | 'all';
  // onClientChange: (value: string) => void;
  // clients: { id: number; nom: string | null }[]; // Llista de clients
}

export function InvoiceFilters({
  searchTerm,
  onSearchChange,
  status,
  onStatusChange,
  // clientId,
  // onClientChange,
  // clients
}: InvoiceFiltersProps) {
  const t = useTranslations('InvoicesPage.filters'); // Namespace per a traduccions de filtres

  return (
    <div className="flex flex-col md:flex-row items-end gap-4">
      {/* Cerca General */}
      <div className="w-full md:w-auto">
        <Label className="py-2" htmlFor="search-invoice">{t('searchLabel')} </Label>
        <Input
          id="search-invoice"
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs" // Ajusta amplada si cal
        />
      </div>

      {/* Filtre per Estat */}
      <div className="w-full md:w-auto">
        <Label className="py-2" htmlFor="status-filter">{t('statusLabel')}</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger id="status-filter" className="w-full md:w-[180px]">
            <SelectValue placeholder={t('statusPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {INVOICE_STATUS_MAP.map((s) => (
              <SelectItem key={s.dbValue} value={s.dbValue}>
                {/* Hauràs d'afegir traduccions per a cada estat, ex: t(`status.${s.key}`) */}
                {s.dbValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

       {/* TODO: Filtre per Client (si cal) */}
       {/* <div className="w-full md:w-auto">
         <Label htmlFor="client-filter">{t('clientLabel')}</Label>
         <Select value={clientId} onValueChange={onClientChange}> ... </Select>
       </div> */}

    </div>
  );
}