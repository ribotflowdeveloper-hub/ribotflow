"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// ✅ Importem el nostre nou component contenidor
import { DashboardCard } from "./_components/DashboardCard";

// ✅ Importem ELS COMPONENTS DE CONTINGUT, no els de layout antics
import { SalesPerformance } from "./_components/SalesPerformance";
import { RecentActivities } from "./_components/RecentActivities";
import { Radar } from "./_components/Radar";
import { TaskDialogManager, EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { toast } from "sonner";
import { startTransition } from "react";  
// ✅ Importem les icones
import { BarChart2, Activity, ListChecks, Radar as RadarIcon, Plus } from "lucide-react";
import { Agenda, TaskFilterStatus } from "./_components/agenda/Agenda"; // ✅ Importem el nou tipus
import { updateSimpleTask } from '@/app/actions/tasks/actions'; // Assegura't que importes l'acció

// ... (els teus imports de tipus es mantenen iguals)
import { Tables } from "@/types/supabase";
// import { Button } from "react-day-picker";
import { Button } from "@/components/ui/button"; // Update this import to your UI library's Button
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  userId: string; // ✅ NOU: Rebem l'ID de l'usuari actual

}
export function DashboardClient({
  initialData,
  teamMembers,
  children,
  userId
}: DashboardClientProps) {
  const t = useTranslations('DashboardClient');
  const router = useRouter();

  // Tota la lògica de dades i estats es manté aquí, la qual cosa és correcte.
  // Aquesta és la responsabilitat d'aquest component "cervell".
  // // Eliminem 'useDashboardTasks', 'viewingTask', i 'isTaskDialogOpen'.
  const [tasks, setTasks] = useState(initialData.tasks);
  const [taskToManage, setTaskToManage] = useState<EnrichedTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Lògica de filtres (no canvia)
  // ✅ Estats per als nous filtres
  const [taskFilter, setTaskFilter] = useState<TaskFilterStatus>('pendents');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState(''); // Estat per a la cerca
  const [showAllTeamTasks, setShowAllTeamTasks] = useState(false); // ✅ NOU ESTAT per veure totes les tasques

  // ✅ Pas 2: Afegim aquest useEffect.
  // Aquest hook s'executarà cada cop que les dades del servidor (initialData) canviïn.
  // Sincronitza l'estat local 'tasks' amb les dades fresques, fent que la UI es refresqui.
  useEffect(() => {
    setTasks(initialData.tasks);
  }, [initialData.tasks]);

  // useMemo per a comptadors i filtres (no canvia)
  // ✅ Comptadors per a cada estat, incloent "assignades"
  const pendingCount = useMemo(() => tasks.filter(t => !t.is_completed && !t.user_asign_id).length, [tasks]);
  const assignedCount = useMemo(() => {
    const baseFilter = (t: EnrichedTask) => t.user_asign_id !== null && !t.is_completed;
    if (showAllTeamTasks) return tasks.filter(baseFilter).length;
    return tasks.filter(t => baseFilter(t) && t.user_asign_id === userId).length;
  }, [tasks, userId, showAllTeamTasks]);
  const completedCount = useMemo(() => {
    const baseFilter = (t: EnrichedTask) => t.is_completed;
    if (showAllTeamTasks) return tasks.filter(baseFilter).length;
    return tasks.filter(t => baseFilter(t) && t.user_asign_id === userId).length;
  }, [tasks, userId, showAllTeamTasks]);

  // ✅ NOVA FUNCIÓ per a gestionar el canvi d'estat amb actualització optimista
  const handleToggleTask = useCallback((taskId: number, currentStatus: boolean) => {
    // Actualització optimista: canviem l'estat a la UI a l'instant
    const previousTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));

    // Cridem a l'acció del servidor en segon pla
    startTransition(async () => {
      const { error } = await updateSimpleTask(taskId, { is_completed: !currentStatus });
      if (error) {
        toast.error("No s'ha pogut actualitzar l'estat de la tasca.");
        setTasks(previousTasks); // Revertim en cas d'error
      }
    });
  }, [tasks]);

  // ✅ LÒGICA DE FILTRATGE CENTRALITZADA
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // 1. Filtre per estat (pendents, assignades, completes)
    if (taskFilter === 'pendents') {
      result = result.filter(t => !t.is_completed && !t.user_asign_id);
    } else if (taskFilter === 'assignades') {
      result = result.filter(t => t.user_asign_id !== null && !t.is_completed);
      if (!showAllTeamTasks) {
        result = result.filter(t => t.user_asign_id === userId);
      }
    } else { // completes
      result = result.filter(t => t.is_completed);
      if (!showAllTeamTasks) {
        result = result.filter(t => t.user_asign_id === userId);
      }
    }

    // 2. Filtre per departament
    if (departmentFilter !== 'all') {
      result = result.filter(t => t.department_id === departmentFilter);
    }

    // 3. Filtre per terme de cerca (en el títol)
    if (searchTerm.trim() !== '') {
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [tasks, taskFilter, departmentFilter, searchTerm, userId, showAllTeamTasks]);

  // ✅ SOLUCIÓ: Aquí centralitzem tota la lògica post-mutació.
  const handleTaskMutation = useCallback(() => {
    // Primer, refresquem les dades del servidor.
    router.refresh();
    // Després, tanquem el diàleg.
    setIsDialogOpen(false);
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
         {/* ✅ AQUEST ÉS EL CONTENIDOR CLAU */}
        <DashboardCard
          title={t('agenda.title')}
          icon={ListChecks}
          // Aquestes classes fan que la targeta ocupi l'alçada de la fila de la graella
          // i que el seu contingut es pugui organitzar verticalment.
          className="lg:col-span-2 h-full flex flex-col"
          actions={
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch id="show-all-tasks" checked={showAllTeamTasks} onCheckedChange={setShowAllTeamTasks} aria-label={t('agenda.viewAll')} />
                <Label htmlFor="show-all-tasks" className="text-xs font-normal cursor-pointer">{t('agenda.viewAll')}</Label>
              </div>
              <Button variant="ghost" size="sm" onClick={openNewTaskDialog}>
                <Plus className="w-4 h-4 mr-2" />
                {t('agenda.newTask')}
              </Button>
            </div>
          }
        >
          <Agenda
            tasks={filteredTasks}
            activeFilter={taskFilter}
            onFilterChange={setTaskFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            onViewTask={openViewTaskDialog}
            pendingCount={pendingCount}
            assignedCount={assignedCount}
            completedCount={completedCount}
            departments={initialData.departments}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onToggleTask={handleToggleTask} // ✅ Passem la nova funció a l'Agenda

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