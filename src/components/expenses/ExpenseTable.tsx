"use client";

import React, { FC } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paperclip } from 'lucide-react';
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { type Expense } from '@/types/finances';

interface ExpenseTableProps {
  expenses: Expense[];
  onViewDetails: (expense: Expense) => void;
}

export const ExpenseTable: FC<ExpenseTableProps> = ({ expenses, onViewDetails }) => {
    return (
        <div className="glass-effect rounded-xl overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="border-b-white/10 hover:bg-white/5">
                        <TableHead>Proveïdor / Descripció</TableHead>
                        <TableHead>Nº Factura</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Import</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.length > 0 ? expenses.map(expense => (
                        <TableRow key={expense.id} className="cursor-pointer hover:bg-white/10 border-b-white/10" onClick={() => onViewDetails(expense)}>
                            <TableCell className="font-medium flex items-center gap-2">
                                {expense.suppliers?.nom || expense.description || 'N/A'}
                                {expense.expense_attachments && expense.expense_attachments.length > 0 && (
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                )}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">{expense.invoice_number || '-'}</TableCell>
                            <TableCell>{expense.expense_date ? format(new Date(expense.expense_date), "dd MMM, yyyy", { locale: ca }) : '-'}</TableCell>
                            <TableCell><span className="bg-white/10 px-2 py-1 text-xs rounded-full">{expense.category || '-'}</span></TableCell>
                            <TableCell className="text-right font-mono">- €{(expense.total_amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                Encara no has registrat cap despesa.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};