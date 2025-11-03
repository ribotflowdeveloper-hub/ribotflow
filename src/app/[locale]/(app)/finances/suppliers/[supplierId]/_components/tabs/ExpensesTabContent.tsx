// src/app/[locale]/(app)/finances/suppliers/[supplierId]/_components/tabs/ExpensesTabContent.tsx
"use client";

import { useState, useTransition } from 'react'; // ✅ Afegim useState i useTransition
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Expense } from '@/types/finances';
import {
  PlusCircle, CreditCard, Link2 as LinkIcon, // ✅ Canviem nom Link2
  Trash2, Loader2 // ✅ Afegim icones
} from 'lucide-react';
import {
  type ExpenseForSupplier,
  unlinkExpenseFromSupplier, // ✅ Importem unlink
  // Si has creat el tipus Expense complet, importa'l també

} from '@/app/[locale]/(app)/finances/expenses/actions';

import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LinkExpenseDialog } from '../LinkExpenseDialog'; // ✅ Importem el nou diàleg
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
} from "@/components/ui/alert-dialog"; // ✅ Importem Alert Dialog
import { toast } from 'sonner';

interface ExpensesTabContentProps {
  expenses: ExpenseForSupplier[];
  supplierId: string;
  t: (key: string) => string;
}

export function ExpensesTabContent({ expenses: initialExpensesProp, supplierId, t }: ExpensesTabContentProps) {
  const router = useRouter();

  // ✅ Gestionem l'estat localment
  const [expenses, setExpenses] = useState(initialExpensesProp || []);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isUnlinking, startUnlinkTransition] = useTransition();

  // ✅ Funció per afegir una despesa vinculada a l'estat
  const handleLinkSuccess = (newlyLinkedExpense: Expense) => {
    // Adaptem el tipus complet 'Expense' al tipus 'ExpenseForSupplier' necessari per la taula
    setExpenses(prevExpenses => [
      ...prevExpenses,
      {
        id: newlyLinkedExpense.id,
        expense_date: newlyLinkedExpense.expense_date,
        description: newlyLinkedExpense.description,
        total_amount: newlyLinkedExpense.total_amount,
        status: newlyLinkedExpense.status, // Assegura't que 'status' existeix a 'Expense'
      } as ExpenseForSupplier
    ].sort((a, b) => new Date(b.expense_date || 0).getTime() - new Date(a.expense_date || 0).getTime())); // Reordenem per data
  };

  // ✅ Funció per gestionar la desvinculació
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t('expensesCard.title')}</CardTitle>
            <CardDescription>{t('expensesCard.description')}</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* ✅ Botó per VINCULAR existent */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkDialogOpen(true)}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t('expensesCard.linkButton')}
            </Button>

            {/* Botó per CREAR nou */}
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/finances/expenses/new?supplierId=${supplierId}`)}
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
                  <TableHead>{t('expensesCard.table.date')}</TableHead>
                  <TableHead>{t('expensesCard.table.description')}</TableHead>
                  <TableHead className="text-right">{t('expensesCard.table.amount')}</TableHead>
                  <TableHead>{t('expensesCard.table.status')}</TableHead>
                  <TableHead className="w-[50px]"> {/* Columna Accions */}
                    <span className="sr-only">Accions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expense_date ?? "")}</TableCell>
                    <TableCell>
                      {/* ✅ MILLORA NAVEGACIÓ: Afegim el paràmetre 'from' */}
                      <Link
                        href={`/finances/expenses/${expense.id}?from=/finances/suppliers/${supplierId}`}
                        className="hover:underline"
                      >
                        {expense.description || `Despesa #${expense.id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={expense.status} /></TableCell>

                    {/* ✅ NOU: Cel·la d'accions (Desvincular) */}
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
                              {/* ✅ SOLUCIÓ: Passem la variable 'expenseDesc' a t() */}
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

      {/* ✅ Afegim el component de diàleg (controlat) */}
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