"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, CreditCard } from 'lucide-react';
import { type ExpenseForSupplier } from '@/app/[locale]/(app)/finances/expenses/actions';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface ExpensesTabContentProps {
  expenses: ExpenseForSupplier[];
  supplierId: string;
  t: (key: string) => string;
}

export function ExpensesTabContent({ expenses, supplierId, t }: ExpensesTabContentProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />{t('expensesCard.title')}</CardTitle>
          <CardDescription>{t('expensesCard.description')}</CardDescription>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(`/finances/expenses/new?supplierId=${supplierId}`)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {t('expensesCard.newButton')}
        </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>
                    <Link href={`/finances/expenses/${expense.id}`} className="hover:underline">{expense.description}</Link>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(expense.total_amount)}</TableCell>
                  {/* Assumeix que StatusBadge accepta 'expense.status' */}
                  <TableCell><StatusBadge status={expense.status} /></TableCell> 
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{t('expensesCard.empty')}</p>
        )}
      </CardContent>
    </Card>
  );
}