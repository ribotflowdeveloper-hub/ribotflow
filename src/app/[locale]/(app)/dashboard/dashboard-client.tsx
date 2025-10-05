"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import type { DashboardInitialData, Task } from '@/types/crm'; 

// Importació dels sub-components. Hauràs de crear cada un al seu propi fitxer.
import { StatCard } from '@/components/shared/StartCard';
import { SalesPerformance } from './_components/SalesPerformance';
import { QuickAccess } from './_components/QuickAccess';
import { Agenda } from './_components/Agenda';
import { Radar } from './_components/Radar';
import { RecentActivities } from './_components/RecentActivities';
import AddTaskDialog from './_components/AddTaskDialog';
import { BadgePercent, Euro, Target, Users } from 'lucide-react';



const MONTHLY_GOAL = 50000;

export function DashboardClient({ initialData, children }: { 
  initialData: DashboardInitialData, 
  children: React.ReactNode 
}) {
  const t = useTranslations('DashboardClient');
  const router = useRouter();
  const supabase = createClient()
;
  
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const originalTasks = [...tasks];
    setTasks(currentTasks => currentTasks.map(t => (t.id === taskId ? { ...t, is_completed: !currentStatus } : t)));
    
    const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
    
    if (error) {
      toast.error(t('toast.errorTitle'), { description: t('taskUpdateError') });
      setTasks(originalTasks);
    }
  };

  const pendingTasks = useMemo(() => tasks.filter(t => !t.is_completed), [tasks]);
  
  const percentGoal = useMemo(() => {
    if (!initialData.stats) return 0;
    return Math.max(0, Math.min(100, Math.round((initialData.stats.invoiced / MONTHLY_GOAL) * 100)));
  }, [initialData.stats]);

  return (
    <>
      {/* Fons decoratiu de la pàgina. */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />
      
      <div className="space-y-8">
        {/* Secció de KPIs (Targetes d'Estadístiques) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard href="/crm/contactes" icon={Users} title={t('totalContacts')} value={initialData.stats.totalContacts.toLocaleString()} color="bg-[#2d7ef7]" openText={t('openLink')} />
          <StatCard href="/crm/pipeline" icon={Target} title={t('activeOpportunities')} value={initialData.stats.opportunities.toLocaleString()} color="bg-[#12a150]" openText={t('openLink')} />
          <StatCard href="/finances/facturacio" icon={Euro} title={t('monthlyInvoicing')} value={`€${initialData.stats.invoiced.toLocaleString()}`} color="bg-[#8a3ffc]" openText={t('openLink')} />
          <StatCard href="/finances/facturacio" icon={BadgePercent} title={t('pendingVAT')} value={`€${initialData.stats.pending.toLocaleString()}`} color="bg-[#f27917]" openText={t('openLink')} />
        </div>

        {/* Cos principal: Rendiment de Vendes i Activitats Recents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SalesPerformance stats={initialData.stats} percentGoal={percentGoal} monthlyGoal={MONTHLY_GOAL} />
          <RecentActivities overdueInvoices={initialData.overdueInvoices} tasks={initialData.tasks} contacts={initialData.contacts} />
        </div>

        {/* Secció d'Accés Ràpid */}
        <QuickAccess />

        {/* Seccions finals: Agenda, Radar i Oracle d'IA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Agenda 
            pendingTasks={pendingTasks} 
            onToggleTask={handleToggleTask} 
            onOpenNewTask={() => setTaskDialogOpen(true)} 
          />
          <div className="space-y-6">
            <Radar 
              attentionContacts={initialData.attentionContacts} 
              overdueInvoices={initialData.overdueInvoices} 
              notifications={initialData.notifications}

            />
            {/* El component Oracle d'IA es passa com a 'children' des del servidor per a streaming. */}
            {children}
          </div>
        </div>
      </div>
      
      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        contacts={initialData.contacts}
        onTaskCreated={() => {
          router.refresh();
          toast.success(t('taskCreationSuccess'));
        }}
      />
    </>
  );
}