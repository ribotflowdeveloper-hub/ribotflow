// src/components/shared/ColumnToggleButton.tsx
'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type ColumnDef } from './GenericDataTable'; // Assumint que el tipus està aquí

interface ColumnToggleButtonProps<TData> {
  allColumns: ColumnDef<TData>[];
  columnVisibility: Record<string, boolean>;
  toggleColumnVisibility: (columnKey: string) => void;
}

export function ColumnToggleButton<TData>({
  allColumns,
  columnVisibility,
  toggleColumnVisibility,
}: ColumnToggleButtonProps<TData>) {
  const t = useTranslations('Shared.table');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t('view')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns
          // Opcional: Filtrem columnes que no volem que l'usuari pugui amagar (com les accions)
          .filter(column => column.accessorKey !== 'actions_edit')
          .map((column) => {
            const columnKey = column.accessorKey.toString();
            return (
              <DropdownMenuCheckboxItem
                key={columnKey}
                className="capitalize"
                checked={columnVisibility[columnKey] ?? true}
                onCheckedChange={() => toggleColumnVisibility(columnKey)}
              >
                {/* Intentem obtenir el header com a string, si no, fem servir la clau */}
                {typeof column.header === 'string' ? column.header : columnKey}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}