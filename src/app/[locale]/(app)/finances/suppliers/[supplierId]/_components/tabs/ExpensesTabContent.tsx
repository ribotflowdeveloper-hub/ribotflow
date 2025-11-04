// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/tabs/ExpensesTabContent.tsx (MILLORAT PER A MÒBIL)
"use client";

import { useState, useTransition } from 'react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Expense } from '@/types/finances';
import {
  PlusCircle, CreditCard, Link2 as LinkIcon, 
  Trash2, Loader2 
} from 'lucide-react';
import {
  type ExpenseForSupplier,
  unlinkExpenseFromSupplier, 

} from '@/app/[locale]/(app)/finances/expenses/actions';

import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LinkExpenseDialog } from '../LinkExpenseDialog'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; 
import { toast } from 'sonner';

interface ExpensesTabContentProps {
  expenses: ExpenseForSupplier[];
  supplierId: string;
  t: (key: string) => string;
}

export function ExpensesTabContent({ expenses: initialExpensesProp, supplierId, t }: ExpensesTabContentProps) {
  const router = useRouter();

  const [expenses, setExpenses] = useState(initialExpensesProp || []);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isUnlinking, startUnlinkTransition] = useTransition();

  const handleLinkSuccess = (newlyLinkedExpense: Expense) => {
    setExpenses(prevExpenses => [
      ...prevExpenses,
      {
        id: newlyLinkedExpense.id,
        expense_date: newlyLinkedExpense.expense_date,
        description: newlyLinkedExpense.description,
        total_amount: newlyLinkedExpense.total_amount,
        status: newlyLinkedExpense.status, 
      } as ExpenseForSupplier
    ].sort((a, b) => new Date(b.expense_date || 0).getTime() - new Date(a.expense_date || 0).getTime())); 
  };

  const handleUnlink = (expenseId: number) => {
    startUnlinkTransition(async () => {
      const result = await unlinkExpenseFromSupplier(expenseId, supplierId);
      if (result.success) {
        toast.success(result.message);
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
      } else {
        toast.error(result.message || "Error en desvincular.");
      }
    });
  };

  return (
    <>
      <Card>
        {/* ✅ MILLORA MÒBIL: Capçalera apilable */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t('expensesCard.title')}</CardTitle>
            <CardDescription>{t('expensesCard.description')}</CardDescription>
          </div>
          {/* ✅ MILLORA MÒBIL: Botons apilables i amplada completa en mòbil */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkDialogOpen(true)}
              className="w-full sm:w-auto" // Amplada adaptativa
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t('expensesCard.linkButton')}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/finances/expenses/new?supplierId=${supplierId}`)}
              className="w-full sm:w-auto" // Amplada adaptativa
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {t('expensesCard.newButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {/* ✅ MILLORA MÒBIL: Amaguem Data en pantalles petites */}
                  <TableHead className="hidden md:table-cell">{t('expensesCard.table.date')}</TableHead>
                  <TableHead>{t('expensesCard.table.description')}</TableHead>
                  <TableHead className="text-right">{t('expensesCard.table.amount')}</TableHead>
                  {/* ✅ MILLORA MÒBIL: Amaguem Estat en pantalles petites */}
                  <TableHead className="hidden sm:table-cell">{t('expensesCard.table.status')}</TableHead>
                  <TableHead className="w-[50px]"> 
                    <span className="sr-only">Accions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    {/* ✅ MILLORA MÒBIL: Amaguem Data en pantalles petites */}
                    <TableCell className="hidden md:table-cell">{formatDate(expense.expense_date ?? "")}</TableCell>
                    <TableCell>
                      <Link
                        href={`/finances/expenses/${expense.id}?from=/finances/suppliers/${supplierId}`}
                        className="hover:underline"
                      >
                        {expense.description || `Despesa #${expense.id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.total_amount)}</TableCell>
                    {/* ✅ MILLORA MÒBIL: Amaguem Estat en pantalles petites */}
                    <TableCell className="hidden sm:table-cell"><StatusBadge status={expense.status} /></TableCell>

                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={isUnlinking}
                          >
                            <span className="sr-only">Desvincular despesa</span>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('expensesCard.unlinkDialog.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('expensesCard.unlinkDialog.description') + ' ' + (expense.description || `Despesa #${expense.id}`)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isUnlinking}>Cancel·lar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => expense.id !== undefined && handleUnlink(expense.id)}
                              disabled={isUnlinking}
                            >
                              {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desvincular"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('expensesCard.empty')}</p>
          )}
        </CardContent>
      </Card>

      <LinkExpenseDialog
        supplierId={supplierId}
        isOpen={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        onLinkSuccess={handleLinkSuccess}
        t={t}
      />
    </>
  );
}