"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDashboardTasks } from "./_hooks/useDashboardTasks";

// 🧩 Components del dashboard
import { StatCardsGrid } from "./_components/StatCardsGrid";       // → Targetes estadístiques resum
import { DashboardMainGrid } from "./_components/DashboardMainGrid"; // → Secció superior: vendes + activitats
import { QuickAccess } from "./_components/QuickAccess";             // → Accions ràpides (botons, accessos)
import { DashboardBottomGrid } from "./_components/DashboardBottomGrid"; // → Secció inferior: agenda + radar + oracle IA
import AddTaskDialog from "./_components/AddTaskDialog";             // → Diàleg per crear noves tasques

import type { DashboardInitialData } from "@/types/crm";

// 🎯 Objectiu mensual (s'utilitza per calcular el % de progrés)
const MONTHLY_GOAL = 50_000;

export function DashboardClient({
  initialData,
  children,
}: {
  initialData: DashboardInitialData;
  children: React.ReactNode;
}) {
  // 🌍 Traduccions i navegació
  const t = useTranslations("DashboardClient");
  const router = useRouter();

  // ✅ Estat per gestionar les tasques
  const { tasks, toggleTask } = useDashboardTasks(initialData.tasks);
  const pendingTasks = tasks.filter((t) => !t.is_completed);

  // ⚙️ Estat per al diàleg de creació de tasques
  const [isTaskDialogOpen, setTaskDialogOpen] = React.useState(false);

  // 🔁 Handler per canviar estat d'una tasca
  const handleToggleTask = React.useCallback(
    (id: string, status: boolean) => {
      toggleTask(id, status);
    },
    [toggleTask]
  );

  // 📊 Percentatge de progrés mensual
  const percentGoal = Math.round(
    (initialData.stats.invoiced / MONTHLY_GOAL) * 100
  );

  return (
    <div className="relative space-y-8">
      {/* 🎨 Fons decoratiu amb patró radial (només visual) */}
      <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* 📈 Targetes estadístiques resum del mes (facturació, quotes, clients...) */}
      <StatCardsGrid stats={initialData.stats} t={t} />

      {/* 🧭 Secció superior: rendiment de vendes + activitats recents */}
      <DashboardMainGrid
        stats={initialData.stats}
        percentGoal={percentGoal}
        monthlyGoal={MONTHLY_GOAL}
        overdueInvoices={initialData.overdueInvoices}
        tasks={initialData.tasks}
        contacts={initialData.contacts}
      />

      {/* ⚡ Accions ràpides (botons d’accés a seccions clau del CRM) */}
      <QuickAccess />

      {/* 🗓️ Secció inferior: agenda + radar + oracle IA (streaming des del servidor) */}
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
