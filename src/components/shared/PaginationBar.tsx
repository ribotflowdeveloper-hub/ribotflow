// src/components/shared/PaginationBar.tsx
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

/**
 * Component reutilitzable per a la barra de paginació.
 * ✅ El Per Què: Encapsula la lògica de navegació i visualització de rang,
 * mantenint la consistència a tota l'aplicació (Quotes, Expenses, Invoices).
 */
export function PaginationBar({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
    isLoading,
    resourceName
}: PaginationBarProps) {
    const t = useTranslations('Shared.Pagination'); // Assumint una clau d'i18n

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between space-x-6 text-sm text-muted-foreground p-2">
            {/* Informació de Rang */}
            <div className="flex items-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                <span>
                    {t('showing')} {startItem}-{endItem} {t('of')} {totalItems} {resourceName}
                </span>
            </div>

            {/* Controls de Navegació */}
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="font-medium text-foreground">
                    {currentPage} / {totalPages}
                </span>
                
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}