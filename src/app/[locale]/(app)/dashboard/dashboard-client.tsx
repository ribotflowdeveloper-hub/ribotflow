// src/app/[locale]/(app)/dashboard/dashboard-client.tsx (COMPLET I CORREGIT)

"use client";

import React, { useState, useMemo, useCallback, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from 'next/link';
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  BarChart2,
  Activity,
  ListChecks,
  Radar as RadarIcon,
  Plus,
  Calendar,
  Quote,
  Mail,
  MoreVertical // ➕ AFEGIT: Icona per al menú mòbil
} from "lucide-react";

import { ModuleCard } from "@/components/shared/ModuleCard";
import { SalesPerformance } from "./_components/SalesPerformance";
import { RecentActivities } from "./_components/RecentActivities";
import { Radar } from "./_components/Radar";
import { Agenda, TaskFilterStatus } from "./_components/agenda/Agenda";

import { TaskDialogManager, EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { updateSimpleTask } from '@/app/actions/tasks/actions';

import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ServerActivityItem } from "@/lib/data/dashboard";
import { RecentQuotes, EnrichedQuote } from "./_components/RecentQuotes";
import { RecentEmails, EnrichedEmail } from "./_components/RecentEmails";

// ➕ AFEGIT: Imports per al DropdownMenu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    tasks: EnrichedTask[];
    departments: Tables<'departments'>[];
    contacts: Tables<'contacts'>[];
    overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
    attentionContacts: Tables<'contacts'>[];
    notifications: Tables<'notifications'>[];
    recentActivities: ServerActivityItem[];
    recentQuotes: EnrichedQuote[];
    recentEmails: EnrichedEmail[];
  };
  teamMembers: Tables<'team_members_with_profiles'>[];
  children: React.ReactNode;
  userId: string;
  activeTeamId: string;
}

export function DashboardClient({
  initialData,
  teamMembers,
  children,
  userId,
  activeTeamId
}: DashboardClientProps) {
  const t = useTranslations('DashboardClient');
  const router = useRouter();

  const [tasks, setTasks] = useState(initialData.tasks);
  const [taskToManage, setTaskToManage] = useState<EnrichedTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilterStatus>('pendents');
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllTeamTasks, setShowAllTeamTasks] = useState(false);

  useEffect(() => {
    setTasks(initialData.tasks);
  }, [initialData.tasks]);

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

  const handleTaskMutation = useCallback((options: { closeDialog?: boolean } = {}) => {
    const { closeDialog = true } = options;
    router.refresh();
    if (closeDialog) {
      setIsDialogOpen(false);
    }
  }, [router]);

  const handleToggleTask = useCallback((task: EnrichedTask) => {
    const previousTasks = tasks;
    let updateData: Partial<Tables<'tasks'>> = {};
    let successMessage = "";

    if (task.is_completed) {
      updateData = {
        is_completed: false,
        finish_date: null
      };
      successMessage = "Tasca reoberta.";
    } else if (task.user_asign_id) {
      updateData = {
        is_completed: true,
        finish_date: new Date().toISOString()
      };
      successMessage = "Tasca completada!";
    } else {
      updateData = {
        user_asign_id: userId,
        asigned_date: new Date().toISOString()
      };
      successMessage = `T'has assignat la tasca.`;
    }

    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, ...updateData } as EnrichedTask
          : t
      )
    );

    startTransition(async () => {
      const { error } = await updateSimpleTask(task.id, updateData);
      if (error) {
        toast.error("No s'ha pogut actualitzar l'estat de la tasca.");
        setTasks(previousTasks);
      } else {
        toast.success(successMessage);
        handleTaskMutation({ closeDialog: false });
      }
    });
  }, [tasks, userId, handleTaskMutation]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (taskFilter === 'pendents') {
      result = result.filter(t => !t.is_completed && !t.user_asign_id);
    } else if (taskFilter === 'assignades') {
      result = result.filter(t => t.user_asign_id !== null && !t.is_completed);
      if (!showAllTeamTasks) {
        result = result.filter(t => t.user_asign_id === userId);
      }
    } else {
      result = result.filter(t => t.is_completed);
      if (!showAllTeamTasks) {
        result = result.filter(t => t.user_asign_id === userId);
      }
    }

    if (departmentFilter !== 'all') {
      result = result.filter(t => t.department_id === departmentFilter);
    }

    if (searchTerm.trim() !== '') {
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [tasks, taskFilter, departmentFilter, searchTerm, userId, showAllTeamTasks]);

  const openNewTaskDialog = () => {
    setTaskToManage(null);
    setIsDialogOpen(true);
  };

  const openViewTaskDialog = (task: EnrichedTask) => {
    setTaskToManage(task);
    setIsDialogOpen(true);
  };

  {/* ❗ CORREGIT: L'alçada ara és automàtica en mòbil (h-auto) i fixa en escriptori (md:h-96) */ }
  const midaCardsSuperiors = "h-auto md:h-96";

  return (
    <div className="relative w-full ">
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(theme(colors.gray.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.slate.800)_1px,transparent_1px)] [background-size:16px_16px]" />

      <motion.div
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <ModuleCard title={t('recentQuotes')} icon={Quote} variant="quotes" className={midaCardsSuperiors}>
            <RecentQuotes quotes={initialData.recentQuotes} />
          </ModuleCard>
          <ModuleCard title={t('inbox.title')} icon={Mail} variant="inbox" className={midaCardsSuperiors}>
            <RecentEmails emails={initialData.recentEmails} />
          </ModuleCard>
          <ModuleCard title={t('recentActivities')} icon={Activity} variant="activity" className={midaCardsSuperiors}>
            <RecentActivities activities={initialData.recentActivities} />
          </ModuleCard>
          <ModuleCard title={t('radar')} icon={RadarIcon} variant="radar" className={midaCardsSuperiors}>
            <Radar
              attentionContacts={initialData.attentionContacts}
              overdueInvoices={initialData.overdueInvoices}
              notifications={initialData.notifications}
            />
          </ModuleCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <ModuleCard title={t('salesPerformance')} icon={BarChart2} variant="sales">
              <SalesPerformance
                stats={initialData.stats}
                percentGoal={Math.round((initialData.stats.invoiced / MONTHLY_GOAL) * 100)}
                monthlyGoal={MONTHLY_GOAL}
              />
            </ModuleCard>
          </div>
          <div className="lg:col-span-3">
            <ModuleCard
              title={t('agenda.title')}
              icon={ListChecks}
              variant="agenda"
              className=""
              actions={
                // ❗ --- INICI CORRECCIÓ MOBIL ---
                <>
                  {/* Vista Escriptori (md i amunt) */}
                  <div className="hidden md:flex items-center space-x-4">
                    <Button asChild variant="outline" size="icon" className="flex-shrink-0 bg-primary-foreground/20 hover:bg-primary-foreground/70 border-primary/10">
                      <Link href="/crm/calendari" aria-label={"Calendar"}> <Calendar className="h-5 w-5" /> </Link>
                    </Button>
                    <div className="flex items-center space-x-2">
                      {/* IDs únics per a accessibilitat */}
                      <Switch id="show-all-tasks-desktop" checked={showAllTeamTasks} onCheckedChange={setShowAllTeamTasks} aria-label={t('agenda.viewAll')} />
                      <Label htmlFor="show-all-tasks-desktop" className="text-xm font-normal cursor-pointer text-primary-foreground">{t('agenda.viewAll')}</Label>
                    </div>
                    <Button variant="ghost" onClick={openNewTaskDialog} className="flex-shrink-0 bg-primary-foreground/20 hover:bg-primary-foreground/70 border-primary/10">
                      <Plus className="w-4 h-4" />
                      {t('agenda.newTask')}
                    </Button>
                  </div>

                  {/* Vista Mòbil (sota md) */}
                  <div className="flex md:hidden items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="bg-primary-foreground/20 hover:bg-primary-foreground/70 border-primary/10">
                          <MoreVertical className="h-5 w-5" />
                          <span className="sr-only">Obrir menú d'accions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('agenda.title')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={openNewTaskDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          <span>{t('agenda.newTask')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/crm/calendari">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Anar al Calendari</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm">
                          <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="show-all-tasks-mobile" className="font-normal cursor-pointer text-foreground">{t('agenda.viewAll')}</Label>
                            <Switch id="show-all-tasks-mobile" checked={showAllTeamTasks} onCheckedChange={setShowAllTeamTasks} aria-label={t('agenda.viewAll')} />
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
                // ❗ --- FI CORRECCIÓ MOBIL ---
              }
            >
              <Agenda
                tasks={filteredTasks}
                activeFilter={taskFilter} onFilterChange={setTaskFilter}
                departmentFilter={departmentFilter} onDepartmentFilterChange={setDepartmentFilter}
                onViewTask={openViewTaskDialog}
                pendingCount={pendingCount} assignedCount={assignedCount} completedCount={completedCount}
                departments={initialData.departments}
                searchTerm={searchTerm} onSearchChange={setSearchTerm}
                onToggleTask={handleToggleTask}
                onTaskMutation={handleTaskMutation}
              />
            </ModuleCard>
          </div>
        </div>

        {children}
      </motion.div>

      <TaskDialogManager
        task={taskToManage}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contacts={initialData.contacts}
        initialDepartments={initialData.departments}
        teamMembers={teamMembers
          .filter(m => m.user_id)
          .map(m => ({ id: m.user_id!, full_name: m.full_name }))
        }
        onTaskMutation={handleTaskMutation}
        activeTeamId={activeTeamId}
      />
    </div>
  );
}