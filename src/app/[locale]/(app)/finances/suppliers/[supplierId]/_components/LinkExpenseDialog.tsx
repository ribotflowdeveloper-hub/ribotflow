// src/app/[locale]/(app)/finances/suppliers/[supplierId]/_components/LinkExpenseDialog.tsx
"use client";

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Link2 as LinkIcon, Search, CreditCard } from 'lucide-react'; // Canviat nom Link2
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

// Importa les noves accions i tipus
import {
  searchExpensesForLinking,
  linkExpenseToSupplier
} from '@/app/[locale]/(app)/finances/expenses/actions';
import { type Expense } from '@/types/finances/expenses'; // Ajusta la ruta/tipus si cal
import { formatDate, formatCurrency } from '@/lib/utils/formatters';

// Tipus per als resultats de la cerca
type SearchResult = Pick<Expense, 'id' | 'description' | 'expense_date' | 'total_amount'>;

interface LinkExpenseDialogProps {
  supplierId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Funció per notificar al pare (ExpensesTabContent) que s'ha vinculat una despesa
  onLinkSuccess: (newlyLinkedExpense: Expense) => void;
  t: (key: string) => string;
}

export function LinkExpenseDialog({
  supplierId,
  isOpen,
  onOpenChange,
  onLinkSuccess,
  t
}: LinkExpenseDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [isLinking, startLinkTransition] = useTransition();

  const handleSearch = useDebouncedCallback((term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    startSearchTransition(async () => {
      const data = await searchExpensesForLinking(term);
      setResults(data);
    });
  }, 300);

  const handleLinkClick = (expenseId: number) => {
    startLinkTransition(async () => {
      const result = await linkExpenseToSupplier(expenseId, supplierId);
      if (result.success && result.data) {
        toast.success(t('expensesCard.linkDialog.toastSuccess'));
        onLinkSuccess(result.data); // Notifica al pare
        onOpenChange(false); // Tanca el diàleg
        setSearchTerm('');
        setResults([]);
      } else {
        toast.error(result.message || t('expensesCard.linkDialog.toastError'));
      }
    });
  };

  // Reseteja l'estat en tancar el diàleg
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchTerm('');
      setResults([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('expensesCard.linkDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('expensesCard.linkDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('expensesCard.linkDialog.searchPlaceholder')}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleSearch(e.target.value);
            }}
          />
        </div>

        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
          {isSearching && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isSearching && results.length === 0 && searchTerm.length >= 2 && (
            <p className="text-sm text-center text-muted-foreground">
              {t('expensesCard.linkDialog.noResults')}
            </p>
          )}
          {results.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-2 border rounded-md"
            >
              <div className="flex items-center gap-2">
                 <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                 <div className="flex flex-col">
                    <p className="text-sm font-medium truncate" title={expense.description || ''}>
                      {expense.description || "Sense descripció"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(expense.expense_date)} - {formatCurrency(expense.total_amount)}
                    </p>
                 </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLinkClick(expense.id)}
                disabled={isLinking}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {t('expensesCard.linkDialog.linkButton')}
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {t('expensesCard.linkDialog.cancelButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}