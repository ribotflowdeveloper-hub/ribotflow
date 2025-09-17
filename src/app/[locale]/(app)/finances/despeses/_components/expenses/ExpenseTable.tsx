"use client";

import React, { FC } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paperclip } from 'lucide-react';
import { format } from "date-fns";

import { type Expense } from '../../types';
import { useLocale, useTranslations } from 'next-intl';
import { ca, es, enUS } from "date-fns/locale";

// Definim les propietats que espera el component.
interface ExpenseTableProps {
    expenses: Expense[]; // Llista de despeses a mostrar.
    onViewDetails: (expense: Expense) => void; // Funció a executar en clicar una fila.
}

/**
 * Component presentacional per mostrar la llista de despeses en format de taula.
 * Cada fila és clicable per obrir el calaix de detalls.
 */
export const ExpenseTable: FC<ExpenseTableProps> = ({ expenses, onViewDetails }) => {
    const t = useTranslations('Expenses');
    const locale = useLocale();

    const getDateLocale = () => {
        switch (locale) {
            case 'es': return es;
            case 'en': return enUS;
            default: return ca;
        }
    };
    return (
        <div className="glass-effect rounded-xl overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="border-b-white/10 hover:bg-white/5">
                        <TableHead>{t('tableHeaderSupplier')}</TableHead>
                        <TableHead>{t('tableHeaderInvoiceNo')}</TableHead>
                        <TableHead>{t('tableHeaderDate')}</TableHead>
                        <TableHead>{t('tableHeaderCategory')}</TableHead>
                        <TableHead className="text-right">{t('tableHeaderAmount')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.length > 0 ? expenses.map(expense => (
                        // Fem que tota la fila sigui clicable per a una millor UX.
                        <TableRow key={expense.id} className="cursor-pointer hover:bg-white/10 border-b-white/10" onClick={() => onViewDetails(expense)}>
                            <TableCell className="font-medium flex items-center gap-2">
                                {/* Mostra el nom del proveïdor o la descripció general si no n'hi ha. */}
                                {expense.suppliers?.nom || expense.description || 'N/A'}
                                {/* Mostra una icona de clip si la despesa té arxius adjunts. */}
                                {expense.expense_attachments && expense.expense_attachments.length > 0 && (
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                )}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">{expense.invoice_number || '-'}</TableCell>
                            <TableCell>{expense.expense_date ? format(new Date(expense.expense_date), "dd MMM, yyyy", { locale: getDateLocale() }) : '-'}</TableCell>
                            <TableCell><span className="bg-white/10 px-2 py-1 text-xs rounded-full">{expense.category || '-'}</span></TableCell>
                            <TableCell className="text-right font-mono">- €{(expense.total_amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    )) : (
                        // Fila per a l'estat buit, que ocupa totes les columnes.
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                {t('emptyState')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};