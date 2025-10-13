"use client";

import React, { useState, useMemo } from "react"; // ✅ AFEGIM useMemo
import { useRouter } from "next/navigation";

import { useDashboardTasks } from "./_hooks/useDashboardTasks";

// 🧩 Components del dashboard
import { StatCardsGrid } from "./_components/StatCardsGrid";
import { DashboardMainGrid } from "./_components/DashboardMainGrid";
import { QuickAccess } from "./_components/QuickAccess";
import { DashboardBottomGrid } from "./_components/DashboardBottomGrid";
import AddTaskDialog from "./_components/agenda/AddTaskDialog";
import { TaskDetailDialog } from "./_components/agenda/TaskDetailDialog";
import { Tables } from "@/types/supabase"; // Pas 1: Importar l'helper de tipus
import { TaskWithContact } from '@/types/dashboard/types'; // Importem el nostre tipus centralitzat  

// 🎯 Objectiu mensual
const MONTHLY_GOAL = 50_000;

// Pas 2: Definir les propietats amb els tipus de Supabase

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
    tasks: TaskWithContact[]; // ✅ Utilitzem el nostre tipus centralitzat
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
  // 🌍 Traduccions i navegació
  const router = useRouter();

  // ✅ Estat per gestionar les tasques
  const { tasks, toggleTask } = useDashboardTasks(initialData.tasks);
  const [viewingTask, setViewingTask] = useState<(Tables<'tasks'> & { contacts: { id: number; nom: string; } | null }) | null>(null);

  // ✅ NOU ESTAT: Estat per gestionar el filtre actiu
  const [taskFilter, setTaskFilter] = useState<'pendents' | 'completes'>('pendents');
  // ✅ CÀLCUL DELS COMPTADORS
  const pendingCount = useMemo(() => tasks.filter(t => !t.is_completed).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter(t => t.is_completed).length, [tasks]);

  // ✅ NOVA LÒGICA: Memoitzem la llista de tasques filtrades per optimitzar el rendiment
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'pendents') {
      return tasks.filter((t) => !t.is_completed);
    }
    return tasks.filter((t) => t.is_completed);
  }, [tasks, taskFilter]); // Es recalcula només si 'tasks' o 'taskFilter' canvien


  // ⚙️ Estat per al diàleg de creació de tasques
  const [isTaskDialogOpen, setTaskDialogOpen] = React.useState(false);

  // 🔁 Handler per canviar estat d'una tasca
  // 🔁 Handler per canviar estat d'una tasca
  // A DashboardClient.tsx
  const handleToggleTask = React.useCallback(
    // ✅ CORRECCIÓ: Canvia 'string' per 'number' aquí
    (id: number, is_completed: boolean) => {
      toggleTask(id, is_completed);
    },
    [toggleTask]
  );

  // 📊 Percentatge de progrés mensual
  const percentGoal = Math.round(
    (initialData.stats.invoiced / MONTHLY_GOAL) * 100
  );

  return (
    <div className="relative space-y-8">
      {/* 🎨 Fons decoratiu amb patró radial */}
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* 📈 Targetes estadístiques */}
      <StatCardsGrid stats={initialData.stats} />

      {/* 🧭 Secció superior */}
      <DashboardMainGrid
        stats={initialData.stats}
        percentGoal={percentGoal}
        monthlyGoal={MONTHLY_GOAL}
        overdueInvoices={initialData.overdueInvoices}
        tasks={initialData.tasks}
        contacts={initialData.contacts}
      />

      {/* ⚡ Accions ràpides */}
      <QuickAccess />

      {/* 🗓️ Secció inferior */}
      <DashboardBottomGrid
        // ✅ PASSEM LES NOVES PROPS
        tasks={filteredTasks} // Passem la llista ja filtrada
        activeFilter={taskFilter} // Passem el filtre actiu
        onFilterChange={setTaskFilter} // Passem la funció per canviar el filtre
        onViewTask={setViewingTask} // Passem la funció per obrir el diàleg
        pendingCount={pendingCount}   // ✅ Passem el comptador
        completedCount={completedCount} // ✅ Passem el comptador
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
      />
      {/* 🧩 Diàleg per crear noves tasques */}
      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        contacts={initialData.contacts}
        onTaskCreated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}