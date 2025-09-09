"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExpenseDialog } from '@/components/expenses/ExpenseDialog';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExpenseDetailDrawer } from '@/components/expenses/ExpenseDetailDrawer';
import { type Expense, type Supplier } from '@/types/finances';
import { createClient } from '@/lib/supabase/client';

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialSuppliers: Supplier[];
}

export function ExpensesClient({ initialExpenses, initialSuppliers }: ExpensesClientProps) {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const supabase = createClient();

  const handleCreateNew = () => {
    setSelectedExpense(null);
    setIsFormDialogOpen(true);
  };

  const handleViewDetails = async (expense: Expense) => {
    const { data: fullExpense } = await supabase
      .from('expenses')
      .select('*, suppliers(*), expense_items(*), expense_attachments(*)')
      .eq('id', expense.id)
      .single();
    setSelectedExpense(fullExpense || expense);
    setIsDetailDrawerOpen(true);
  };
  
  const handleEditFromDrawer = (expense: Expense) => {
    setIsDetailDrawerOpen(false);
    setSelectedExpense(expense);
    setIsFormDialogOpen(true);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestió de Despeses</h1>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
        
        <ExpenseTable expenses={initialExpenses} onViewDetails={handleViewDetails} />
      </motion.div>

      <ExpenseDetailDrawer
        expense={selectedExpense}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        onEdit={handleEditFromDrawer}
      />

      <ExpenseDialog
        isOpen={isFormDialogOpen}
        setIsOpen={setIsFormDialogOpen}
        initialData={selectedExpense}
        suppliers={initialSuppliers}
      />
    </>
  );
}