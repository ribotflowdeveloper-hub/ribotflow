/**
 * @file expenses-client.tsx
 * @summary Aquest fitxer conté el component de client que gestiona tota la interfície interactiva
 * de la pàgina de Gestió de Despeses. S'encarrega d'orquestrar la visualització de la taula,
 * l'obertura del diàleg per crear/editar despeses i del calaix lateral per veure'n els detalls.
 */

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
  // Gestió de l'estat del component.
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false); // Controla la visibilitat del diàleg de creació/edició.
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false); // Controla la visibilitat del calaix de detalls.
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null); // Emmagatzema la despesa seleccionada.
  const supabase = createClient();

  /**
   * @summary Gestor per obrir el diàleg per crear una nova despesa.
   */
  const handleCreateNew = () => {
    setSelectedExpense(null); // Assegurem que no hi ha dades inicials.
    setIsFormDialogOpen(true);
  };

  /**
   * @summary Gestor per veure els detalls complets d'una despesa.
   * Aquesta funció fa una nova consulta al client per obtenir totes les dades relacionades
   * (ítems, adjunts) abans d'obrir el calaix.
   */
  const handleViewDetails = async (expense: Expense) => {
    const { data: fullExpense } = await supabase
      .from('expenses')
      .select('*, suppliers(*), expense_items(*), expense_attachments(*)')
      .eq('id', expense.id)
      .single();
    setSelectedExpense(fullExpense || expense);
    setIsDetailDrawerOpen(true);
  };
  
  /**
   * @summary Gestor per passar del calaix de detalls al diàleg d'edició.
   */
  const handleEditFromDrawer = (expense: Expense) => {
    setIsDetailDrawerOpen(false);
    setSelectedExpense(expense);
    setIsFormDialogOpen(true);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Capçalera de la pàgina amb títol i botó d'acció. */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestió de Despeses</h1>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
        
        {/* La taula de despeses rep les dades inicials i una funció per gestionar el clic en una fila. */}
        <ExpenseTable expenses={initialExpenses} onViewDetails={handleViewDetails} />
      </motion.div>

      {/* Els components de diàleg i calaix es mantenen fora del flux principal per a un millor rendiment
          i per gestionar la seva visibilitat a través de l'estat del component pare. */}
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
