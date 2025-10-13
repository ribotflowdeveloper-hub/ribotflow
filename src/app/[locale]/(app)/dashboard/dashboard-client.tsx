"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDashboardTasks } from "./_hooks/useDashboardTasks";

// 🧩 Components del dashboard
import { StatCardsGrid } from "./_components/StatCardsGrid";
import { DashboardMainGrid } from "./_components/DashboardMainGrid";
import { QuickAccess } from "./_components/QuickAccess";
import { DashboardBottomGrid } from "./_components/DashboardBottomGrid";
import AddTaskDialog from "./_components/AddTaskDialog";

import { Tables } from "@/types/supabase"; // Pas 1: Importar l'helper de tipus

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
    tasks: Tables<'tasks'>[];
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
  const t = useTranslations("DashboardClient");
  const router = useRouter();

  // ✅ Estat per gestionar les tasques
  const { tasks, toggleTask } = useDashboardTasks(initialData.tasks);
  const pendingTasks = tasks.filter((t) => !t.is_completed);

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
        pendingTasks={pendingTasks}
        onToggleTask={handleToggleTask}
        onOpenNewTask={() => setTaskDialogOpen(true)}
        attentionContacts={initialData.attentionContacts}
        overdueInvoices={initialData.overdueInvoices}
        notifications={initialData.notifications}
      >
        {children}
      </DashboardBottomGrid>

      {/* 🧩 Diàleg per crear noves tasques */}
      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        contacts={initialData.contacts}
        onTaskCreated={() => {
          router.refresh();
          toast.success(t("taskCreationSuccess"));
        }}
      />
    </div>
  );
}