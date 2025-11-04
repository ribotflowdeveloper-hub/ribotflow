"use client";

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  isLoading: boolean;
  resourceName: string; // Nom del recurs (e.g., 'despeses', 'factures')
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  isLoading,
  resourceName
}: PaginationBarProps) {
  const t = useTranslations('Shared.Pagination');

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className="
        flex flex-col sm:flex-row sm:items-center sm:justify-between 
        gap-2 sm:gap-4 p-3 border-t text-sm text-muted-foreground
      "
    >
      {/* 📊 Informació del rang */}
      <div className="flex items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        <span className="truncate text-xs sm:text-sm">
          {t('showing')} {startItem}-{endItem} {t('of')} {totalItems} {resourceName}
        </span>
      </div>

      {/* 🔁 Controls de navegació */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="font-medium text-foreground text-xs sm:text-sm min-w-[60px] text-center">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
