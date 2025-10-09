"use client";

import React, { memo } from "react";
import type { DashboardInitialData } from "@/types/crm";
import { SalesPerformance } from "./SalesPerformance";
import { RecentActivities } from "./RecentActivities";

/**
 * @file DashboardMainGrid.tsx
 * @description Conté el bloc principal del dashboard: rendiment de vendes + activitats recents.
 */

interface DashboardMainGridProps {
  stats: DashboardInitialData["stats"];
  percentGoal: number;
  monthlyGoal: number;
  overdueInvoices: DashboardInitialData["overdueInvoices"];
  tasks: DashboardInitialData["tasks"];
  contacts: DashboardInitialData["contacts"];
}

/**
 * ✅ Component memoitzat per optimitzar rendiment.
 * Manté el layout consistent i responsive.
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
