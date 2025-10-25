// src/app/[locale]/(app)/finances/invoices/_components/InvoiceFilters.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ❗ Eliminem Label si ja no s'usa directament per embolcallar
// import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { type InvoiceStatus } from "@/types/finances/invoices"; // Manté l'import de tipus
import { type InvoicePageFilters } from '../actions'; // Manté l'import de tipus

// Opcions d'estat
const statusOptions: { value: InvoiceStatus | 'all', labelKey: string }[] = [
    { value: 'all', labelKey: 'allStatuses' },
    { value: 'Draft', labelKey: 'status.Draft' },
    { value: 'Sent', labelKey: 'status.Sent' },
    { value: 'Paid', labelKey: 'status.Paid' },
    { value: 'Overdue', labelKey: 'status.Overdue' },
    { value: 'Cancelled', labelKey: 'status.Cancelled' },
];

// ✅ CORRECCIÓ: Interfície de Props Actualitzada
interface InvoiceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  // Ara rep l'objecte 'filters'
  filters: InvoicePageFilters;
  // Ara rep el gestor genèric 'onFilterChange'
  onFilterChange: (key: keyof InvoicePageFilters, value: string) => void;
  clients?: { id: number; nom: string | null }[];
}

export function InvoiceFilters({
  searchTerm,
  onSearchChange,
  // ✅ Rebem les noves props
  filters,
  onFilterChange,
  clients = [],
}: InvoiceFiltersProps) {
  const t = useTranslations('InvoicesPage.filters');
  const tStatus = useTranslations('Shared.InvoicesPage'); // Ajusta si cal

  return (
    // ✅ Tornem a l'estil simple com a ExpensesFilters
    <div className="flex items-center gap-2">
      <Input
        placeholder={t('searchPlaceholder') || "Busca nº o client..."}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs h-9 bg-card border border-input" // Estil unificat
      />

      {/* Filtre per Estat */}
      <Select
        // ✅ Llegim el valor de l'objecte 'filters'
        value={filters.status}
        // ✅ Cridem el gestor genèric amb la clau 'status'
        onValueChange={(value) => onFilterChange('status', value)}
      >
        <SelectTrigger className="w-[160px] h-9 bg-card border border-input"> {/* Estil unificat */}
          <SelectValue placeholder={t('statusPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {tStatus(option.labelKey, {})}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre per Client (Opcional) */}
      {clients.length > 0 && (
          <Select
              // ✅ Llegim el valor de l'objecte 'filters'
              value={filters.contactId}
              // ✅ Cridem el gestor genèric amb la clau 'contactId'
              onValueChange={(value) => onFilterChange('contactId', value)}
          >
              <SelectTrigger className="w-[180px] h-9 bg-card border border-input"> {/* Estil unificat */}
                  <SelectValue placeholder={t('clientPlaceholder') || "Tots els clients"} />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">{t('allClients') || "Tots els clients"}</SelectItem>
                  {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                          {client.nom || `Client #${client.id}`}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
      )}
    </div>
  );
}