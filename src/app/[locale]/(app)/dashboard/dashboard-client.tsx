"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useDashboardTasks } from "./_hooks/useDashboardTasks";

// 🧩 Components
import { StatCardsGrid } from "./_components/StatCardsGrid";
import { DashboardMainGrid } from "./_components/DashboardMainGrid";
import { QuickAccess } from "./_components/QuickAccess";
import { DashboardBottomGrid } from "./_components/DashboardBottomGrid";
import AddTaskDialog from "./_components/agenda/AddTaskDialog";
import { TaskDetailDialog } from "./_components/agenda/TaskDetailDialog";
import { Tables } from "@/types/supabase";
import { TaskWithContact } from '@/types/dashboard/types';

const MONTHLY_GOAL = 50_000;

interface DashboardClientProps {
  initialData: {
    stats: {
      totalContacts: number;
      activeClients: number;
      opportunities: number;
      invoiced: number;
      pending: number;
      expenses: number;
      invoicedChange: string;
      expensesChange: string;
      invoicedIsPositive: boolean;
      expensesIsPositive: boolean;
    };
    tasks: TaskWithContact[];
    departments: Tables<'departments'>[]; // ✅ Assegurem que departments està aquí
    contacts: Tables<'contacts'>[];
    overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
    attentionContacts: Tables<'contacts'>[];
    notifications: Tables<'notifications'>[];
  };
  children: React.ReactNode;
}

export function DashboardClient({
  initialData,
  children,
}: DashboardClientProps) { // ✅ CORRECCIÓ: Eliminem 'departments' d'aquí
  const router = useRouter();

  const { tasks, toggleTask, deleteTask } = useDashboardTasks(initialData.tasks);
  
  // ✅ CORRECCIÓ: Utilitzem el nostre tipus 'TaskWithContact' per a l'estat
  const [viewingTask, setViewingTask] = useState<TaskWithContact | null>(null);

  const [taskFilter, setTaskFilter] = useState<'pendents' | 'completes'>('pendents');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all');

  const pendingCount = useMemo(() => tasks.filter(t => !t.is_completed).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter(t => t.is_completed).length, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    result = result.filter(t => taskFilter === 'pendents' ? !t.is_completed : t.is_completed);
    if (departmentFilter !== 'all') {
      result = result.filter(t => t.department_id === departmentFilter);
    }
    return result;
  }, [tasks, taskFilter, departmentFilter]);

  const [isTaskDialogOpen, setTaskDialogOpen] = React.useState(false);

  const handleToggleTask = useCallback(
    (id: number, is_completed: boolean) => {
      toggleTask(id, is_completed);
    },
    [toggleTask]
  );

  const percentGoal = Math.round(
    (initialData.stats.invoiced / MONTHLY_GOAL) * 100
  );

  return (
    <div className="relative space-y-8">
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />

      <StatCardsGrid stats={initialData.stats} />

      <DashboardMainGrid
        stats={initialData.stats}
        percentGoal={percentGoal}
        monthlyGoal={MONTHLY_GOAL}
        overdueInvoices={initialData.overdueInvoices}
        tasks={initialData.tasks}
        contacts={initialData.contacts}
      />

      <QuickAccess />

      <DashboardBottomGrid
        tasks={filteredTasks}
        activeFilter={taskFilter}
        onFilterChange={setTaskFilter}
        departmentFilter={departmentFilter} // ✅ Passa l'estat actual del filtre
        onDepartmentFilterChange={setDepartmentFilter} // ✅ Passa la funció per canviar-lo
        departments={initialData.departments} // ✅ Passa la llista de departaments
        onViewTask={setViewingTask}
        pendingCount={pendingCount}
        completedCount={completedCount}
        onToggleTask={handleToggleTask}
        onOpenNewTask={() => setTaskDialogOpen(true)}
        attentionContacts={initialData.attentionContacts}
        overdueInvoices={initialData.overdueInvoices}
        notifications={initialData.notifications}
      >
        {children}
      </DashboardBottomGrid>

      <TaskDetailDialog
        task={viewingTask}
        open={!!viewingTask}
        onOpenChange={(isOpen) => !isOpen && setViewingTask(null)}
        onToggleTask={handleToggleTask}
        onDeleteTask={deleteTask}
      />
      
      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        contacts={initialData.contacts}
        departments={initialData.departments} // ✅ Ara s'obté correctament d'initialData
        onTaskCreated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}