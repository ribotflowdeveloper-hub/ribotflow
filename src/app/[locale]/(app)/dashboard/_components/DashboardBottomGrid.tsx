"use client";

import React, { memo } from "react";
import { Agenda } from "./Agenda";
import { Radar } from "./Radar";
import type { Task, Contact, Invoice, CrmNotification } from "@/types/crm";

/**
 * @file DashboardBottomGrid.tsx
 * @description Renderitza la secció inferior del dashboard: Agenda, Radar i Oracle d’IA.
 */

interface DashboardBottomGridProps {
  onToggleTask: (taskId: string, currentStatus: boolean) => void;
  pendingTasks: Task[];
  onOpenNewTask: () => void;
  attentionContacts: Contact[];
  overdueInvoices: Invoice[];
  notifications: CrmNotification[]; // ✅ Prop per a les notificacions CRM  
  children: React.ReactNode; // Oracle d'IA injectat via streaming
}

/**
 * ✅ Component memoitzat per millorar rendiment.
 * Manté la coherència del layout inferior i suporta streaming dinàmic.
 */
export const DashboardBottomGrid = memo(
  ({
    pendingTasks,
    onToggleTask,
    onOpenNewTask,
    attentionContacts,
    overdueInvoices,
    notifications,
    children,
  }: DashboardBottomGridProps) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 🗓️ Agenda de tasques */}
        <Agenda
          pendingTasks={pendingTasks}
          onToggleTask={onToggleTask}
          onOpenNewTask={onOpenNewTask}
        />

        {/* 🎯 Radar + Oracle IA */}
        <div className="space-y-6">
          <Radar
            attentionContacts={attentionContacts}
            overdueInvoices={overdueInvoices}
            notifications={notifications}
          />
          {/* 🧠 Oracle d’IA (streaming des del servidor) */}
          {children}
        </div>
      </div>
    );
  }
);

DashboardBottomGrid.displayName = "DashboardBottomGrid";
