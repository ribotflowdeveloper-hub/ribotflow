"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDashboardTasks } from "./_hooks/useDashboardTasks";

// ✅ Importem el nostre nou component contenidor
import { DashboardCard } from "./_components/DashboardCard";

// ✅ Importem ELS COMPONENTS DE CONTINGUT, no els de layout antics
import { SalesPerformance } from "./_components/SalesPerformance";
import { RecentActivities } from "./_components/RecentActivities";
import { Agenda } from "./_components/agenda/Agenda";
import { Radar } from "./_components/Radar";
import AddTaskDialog from "./_components/agenda/AddTaskDialog";
import { TaskDetailDialog } from "./_components/agenda/TaskDetailDialog";

// ✅ Importem les icones
import { BarChart2, Activity, ListChecks, Radar as RadarIcon, Plus } from "lucide-react";

// ... (els teus imports de tipus es mantenen iguals)
import { Tables } from "@/types/supabase";
import { TaskWithContact } from '@/types/dashboard/types';
// import { Button } from "react-day-picker";
import { Button } from "@/components/ui/button"; // Update this import to your UI library's Button

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
}: DashboardClientProps) {
  

  const t = useTranslations('DashboardClient');
  const router = useRouter();

  // Tota la lògica de dades i estats es manté aquí, la qual cosa és correcte.
  // Aquesta és la responsabilitat d'aquest component "cervell".
  const { tasks, toggleTask, deleteTask } = useDashboardTasks(initialData.tasks);
  const [viewingTask, setViewingTask] = useState<TaskWithContact | null>(null);
  const [taskFilter, setTaskFilter] = useState<'pendents' | 'completes'>('pendents');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all');
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);

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

  const handleToggleTask = useCallback((id: number, is_completed: boolean) => {
    toggleTask(id, is_completed);
  }, [toggleTask]);

  const percentGoal = Math.round((initialData.stats.invoiced / MONTHLY_GOAL) * 100);

  return (
    <div className="relative space-y-6">
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* <StatCardsGrid stats={initialData.stats} /> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title={t('salesPerformance')} icon={BarChart2} className="lg:col-span-2">
          <SalesPerformance stats={initialData.stats} percentGoal={percentGoal} monthlyGoal={MONTHLY_GOAL} />
        </DashboardCard>

        <DashboardCard title={t('recentActivities')} icon={Activity}>
          <RecentActivities overdueInvoices={initialData.overdueInvoices} tasks={initialData.tasks} contacts={initialData.contacts} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard
          title={t('agenda.title')}
          icon={ListChecks}
          className="lg:col-span-2"
          // ✅ AQUÍ LA MÀGIA: Passem el botó com a 'action'
          actions={
            <Button variant="ghost" size="sm" onClick={() => setTaskDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('agenda.newTask')}
            </Button>
          }
        >
          <Agenda
            tasks={filteredTasks}
            activeFilter={taskFilter}
            onFilterChange={setTaskFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            departments={initialData.departments}
            onViewTask={setViewingTask}
            pendingCount={pendingCount}
            completedCount={completedCount}
            onToggleTask={handleToggleTask}
            onOpenNewTask={() => setTaskDialogOpen(true)} // Mantenim per si és útil en altres llocs
          />
        </DashboardCard>
        <div className="space-y-6">
          <DashboardCard title={t('radar')} icon={RadarIcon}>
            <Radar attentionContacts={initialData.attentionContacts} overdueInvoices={initialData.overdueInvoices} notifications={initialData.notifications} />
          </DashboardCard>
          {children}
        </div>
      </div>

      <TaskDetailDialog task={viewingTask} open={!!viewingTask} onOpenChange={(isOpen) => !isOpen && setViewingTask(null)} onToggleTask={handleToggleTask} onDeleteTask={deleteTask} />
      <AddTaskDialog open={isTaskDialogOpen} onOpenChange={setTaskDialogOpen} contacts={initialData.contacts} departments={initialData.departments} onTaskCreated={() => router.refresh()} />
    </div>
  );
}