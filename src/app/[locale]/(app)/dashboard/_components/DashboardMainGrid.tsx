"use client";

import React, { memo } from "react";
import { SalesPerformance } from "./SalesPerformance";
import { RecentActivities } from "./RecentActivities";
import { Tables } from "@/types/supabase";

/**
 * @file DashboardMainGrid.tsx
 * @description Conté el bloc principal del dashboard: rendiment de vendes + activitats recents.
 */

// ✅ CORRECCIÓ: Actualitzem les propietats per a què coincideixin amb les dades reals
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
  tasks: Tables<'tasks'>[];
  contacts: Tables<'contacts'>[];
}

/**
 * ✅ Component memoitzat per optimitzar rendiment.
 */
export const DashboardMainGrid = memo(
  ({
    stats,
    percentGoal,
    monthlyGoal,
    overdueInvoices,
    tasks,
    contacts,
  }: DashboardMainGridProps) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 🧭 Rendiment de vendes */}
        <SalesPerformance
          stats={stats}
          percentGoal={percentGoal}
          monthlyGoal={monthlyGoal}
        />

        {/* 🕒 Activitats recents */}
        <RecentActivities
          overdueInvoices={overdueInvoices}
          tasks={tasks}
          contacts={contacts}
        />
      </div>
    );
  }
);

DashboardMainGrid.displayName = "DashboardMainGrid";