"use client";

import React, { memo } from "react";
import { Agenda } from "./Agenda";
import { Radar } from "./Radar";
// ✅ CORRECCIÓ #1: Eliminem els imports dels tipus antics
// import type { Task, Contact, Invoice, CrmNotification } from "@/types/crm";
import { Tables } from "@/types/supabase"; // I importem el nostre helper de Supabase

/**
 * @file DashboardBottomGrid.tsx
 * @description Renderitza la secció inferior del dashboard: Agenda, Radar i Oracle d’IA.
 */

// ✅ CORRECCIÓ #2: Actualitzem TOTES les propietats amb els nous tipus de Supabase
interface DashboardBottomGridProps {
  // onToggleTask ara rep un 'string' per compatibilitat amb AgendaProps
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
  pendingTasks: Tables<"tasks">[];
  onOpenNewTask: () => void;
  attentionContacts: Tables<"contacts">[];
  // Per a les factures, fem servir el tipus que ja vam definir al component pare
  overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
  notifications: Tables<"notifications">[];
  children: React.ReactNode; // Oracle d'IA injectat via streaming
}

/**
 * ✅ Component memoitzat per millorar rendiment.
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