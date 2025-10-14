"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// ✅ Importem el nostre nou component contenidor
import { DashboardCard } from "./_components/DashboardCard";

// ✅ Importem ELS COMPONENTS DE CONTINGUT, no els de layout antics
import { SalesPerformance } from "./_components/SalesPerformance";
import { RecentActivities } from "./_components/RecentActivities";
import { Agenda } from "./_components/agenda/Agenda";
import { Radar } from "./_components/Radar";
import { TaskDialogManager, EnrichedTask } from '@/components/features/tasks/TaskDialogManager';

// ✅ Importem les icones
import { BarChart2, Activity, ListChecks, Radar as RadarIcon, Plus } from "lucide-react";

// ... (els teus imports de tipus es mantenen iguals)
import { Tables } from "@/types/supabase";
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
    tasks: EnrichedTask[]; // ✅ El tipus de les tasques ara és l'enriquit
    departments: Tables<'departments'>[]; // ✅ Assegurem que departments està aquí
    contacts: Tables<'contacts'>[];
    overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
    attentionContacts: Tables<'contacts'>[];
    notifications: Tables<'notifications'>[];
  };
  teamMembers: Tables<'team_members_with_profiles'>[]; // ✅ NOU: Llista de membres de l'equip des de la vista
  children: React.ReactNode;
}
export function DashboardClient({
  initialData,
  teamMembers,
  children,
}: DashboardClientProps) {
  const t = useTranslations('DashboardClient');
  const router = useRouter();

  // Tota la lògica de dades i estats es manté aquí, la qual cosa és correcte.
  // Aquesta és la responsabilitat d'aquest component "cervell".
  // // Eliminem 'useDashboardTasks', 'viewingTask', i 'isTaskDialogOpen'.
  const [tasks] = useState(initialData.tasks);
  const [taskToManage, setTaskToManage] = useState<EnrichedTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Lògica de filtres (no canvia)
  const [taskFilter, setTaskFilter] = useState<'pendents' | 'completes'>('pendents');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all');

  // useMemo per a comptadors i filtres (no canvia)
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
  
  // Funció per refrescar les dades després d'una mutació.
  const handleTaskMutation = useCallback(() => {
    router.refresh();
  }, [router]);
  
  const openNewTaskDialog = () => {
    setTaskToManage(null);
    setIsDialogOpen(true);
  };

  const openViewTaskDialog = (task: EnrichedTask) => {
    setTaskToManage(task);
    setIsDialogOpen(true);
  };



  return (
    <div className="relative space-y-6">
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* <StatCardsGrid stats={initialData.stats} /> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title={t('salesPerformance')} icon={BarChart2} className="lg:col-span-2">
            <SalesPerformance stats={initialData.stats} percentGoal={Math.round((initialData.stats.invoiced / MONTHLY_GOAL) * 100)} monthlyGoal={MONTHLY_GOAL} />
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
          actions={
            <Button variant="ghost" size="sm" onClick={openNewTaskDialog}>
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
            onViewTask={openViewTaskDialog} // Ara el tipus és correcte
            pendingCount={pendingCount}
            completedCount={completedCount}
            onOpenNewTask={openNewTaskDialog}
          />
        </DashboardCard>
        <div className="space-y-6">
          <DashboardCard title={t('radar')} icon={RadarIcon}>
            <Radar attentionContacts={initialData.attentionContacts} overdueInvoices={initialData.overdueInvoices} notifications={initialData.notifications} />
          </DashboardCard>
          {children}
        </div>
      </div>

      <TaskDialogManager
        task={taskToManage}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contacts={initialData.contacts}
        departments={initialData.departments}
        teamMembers={teamMembers
            .filter(m => m.user_id)
            .map(m => ({ id: m.user_id!, full_name: m.full_name }))
        }
        onTaskMutation={handleTaskMutation}
      />
    </div>
  );
}