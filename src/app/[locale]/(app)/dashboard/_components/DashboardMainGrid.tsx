"use client";

import React, { memo } from "react";
import { SalesPerformance } from "./SalesPerformance";
import { RecentActivities } from "./RecentActivities";
import { Tables } from "@/types/supabase";
// ✅ 1. Importem la funció que ja sap com transformar les dades.
import { getRecentActivities } from '@/lib/data/dashboard'; 
// ✅ 2. Importem el tipus de tasca correcte que retorna la funció getTasks.
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';

interface DashboardMainGridProps {
  stats: {
    invoiced: number;
    expenses: number;
    invoicedChange: string;
    expensesChange: string;
    invoicedIsPositive: boolean;
    expensesIsPositive: boolean;
  };
  percentGoal: number;
  monthlyGoal: number;
  overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
  // ✅ 3. Assegurem que el tipus de 'tasks' sigui el correcte.
  tasks: EnrichedTask[];
  contacts: Tables<'contacts'>[];
}

export const DashboardMainGrid = memo(
  ({
    stats,
    percentGoal,
    monthlyGoal,
    overdueInvoices,
    tasks,
    contacts,
  }: DashboardMainGridProps) => {

    // ✅ 4. Utilitzem la funció importada per generar l'array d'activitats.
    // Aquesta funció ja gestiona correctament els tipus, noms de propietats i valors nuls.
    const activities = getRecentActivities(overdueInvoices, tasks, contacts);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 🧭 Rendiment de vendes */}
        <SalesPerformance
          stats={stats}
          percentGoal={percentGoal}
          monthlyGoal={monthlyGoal}
        />

        {/* 🕒 Activitats recents */}
        {/* ✅ 5. Passem l'array 'activities' ja formatat i correctament tipat. */}
        <RecentActivities activities={activities} />
      </div>
    );
  }
);

DashboardMainGrid.displayName = "DashboardMainGrid";