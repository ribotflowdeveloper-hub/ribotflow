"use client";

import React, { memo } from "react";
import { Agenda } from "./agenda/Agenda";
import { Radar } from "./Radar";
import { Tables } from "@/types/supabase";
import { TaskWithContact } from "@/types/dashboard/types"; // ✅ 1. Importem el nostre tipus de tasca enriquida

/**
 * @file DashboardBottomGrid.tsx
 * @description Renderitza la secció inferior del dashboard: Agenda, Radar i Oracle d’IA.
 */

interface DashboardBottomGridProps {
  tasks: TaskWithContact[]; // ✅ 2. Utilitzem el tipus correcte per a les tasques
  activeFilter: 'pendents' | 'completes';
  onFilterChange: (filter: 'pendents' | 'completes') => void;
  onOpenNewTask: () => void;
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
  onViewTask: (task: TaskWithContact) => void; // ✅ 3. Afegim la nova prop que faltava
  pendingCount: number;
  completedCount: number;
  attentionContacts: Tables<"contacts">[];
  overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
  notifications: Tables<"notifications">[];
  children: React.ReactNode;
  departments: Tables<'departments'>[];
  departmentFilter: number | 'all';
  onDepartmentFilterChange: (filter: number | 'all') => void;
}

/**
 * ✅ Component memoitzat per millorar rendiment.
 */
export const DashboardBottomGrid = memo(
  ({
    tasks,
    activeFilter,
    onFilterChange,
    onToggleTask,
    onOpenNewTask,
    onViewTask, // Rebem la nova prop
    pendingCount,
    completedCount,
    attentionContacts,
    overdueInvoices,
    notifications,
    children,
    departments,
    departmentFilter,
    onDepartmentFilterChange,
  }: DashboardBottomGridProps) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 🗓️ Agenda de tasques */}
        <Agenda
          tasks={tasks}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onToggleTask={onToggleTask}
          onOpenNewTask={onOpenNewTask}
          onViewTask={onViewTask} // ✅ 4. La passem al component fill 'Agenda'
          pendingCount={pendingCount}
          completedCount={completedCount}
          departments={departments}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={onDepartmentFilterChange}
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