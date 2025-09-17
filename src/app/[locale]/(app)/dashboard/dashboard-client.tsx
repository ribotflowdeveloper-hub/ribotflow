/**
 * @file dashboard-client.tsx
 * @summary Orquestra la interfície interactiva del Dashboard, unint tots els seus sub-components.
 * Gestiona l'estat centralitzat (com les tasques) i passa les dades als fills.
 */
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { Users, Target, Euro, BadgePercent } from 'lucide-react';

// Importació dels tipus de dades des del fitxer centralitzat.
import type { DashboardInitialData, Task } from './types';

// Importació dels nous sub-components.
import { StatCard } from './_components/StartCard';
import { SalesPerformance } from './_components/SalesPerformance';
import { QuickAccess } from './_components/QuickAccess';
import { Agenda } from './_components/Agenda';
import { Radar } from './_components/Radar';
import { RecentActivities } from './_components/RecentActivities';
import AddTaskDialog from './_components/AddTaskDialog';

// Definim la meta de facturació mensual.
const MONTHLY_GOAL = 50000;

export function DashboardClient({ initialData, children }: { initialData: DashboardInitialData, children: React.ReactNode }) {
  const t = useTranslations('DashboardClient');
  const router = useRouter();
  const supabase = createClient();
  
  // L'estat de les tasques es manté aquí perquè diversos components fills el necessiten.
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);

  /**
   * @summary Gestor per marcar/desmarcar una tasca com a completada amb UI Optimista.
   */
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const originalTasks = [...tasks];
    // Actualització optimista de la UI.
    setTasks(currentTasks => currentTasks.map(t => (t.id === taskId ? { ...t, is_completed: !currentStatus } : t)));
    
    const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
    
    // Si hi ha un error, revertim l'estat i notifiquem.
    if (error) {
      toast.error(t('toast.errorTitle'), { description: t('taskUpdateError') });
      setTasks(originalTasks);
    }
  };

  /**
   * @summary Dades derivades amb 'useMemo' per a optimitzar el rendiment.
   * Aquests càlculs només es tornen a fer si les seves dependències canvien.
   */
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