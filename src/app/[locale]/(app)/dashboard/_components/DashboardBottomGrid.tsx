"use client";

import React, { memo } from "react";
import { Agenda, type TaskFilterStatus } from "./agenda/Agenda"; // ✅ 1. Importem el nou tipus de filtre
import { Radar } from "./Radar";
import { Tables } from "@/types/supabase";
// ✅ 2. Importem el tipus de tasca més complet
import { type EnrichedTask } from "@/components/features/tasks/TaskDialogManager";

interface DashboardBottomGridProps {
  tasks: EnrichedTask[]; // ✅ 3. Canviem al tipus EnrichedTask[]
  activeFilter: TaskFilterStatus; // ✅ 4. Usem el tipus de filtre correcte
  onFilterChange: (filter: TaskFilterStatus) => void; // ✅ 5. Usem el tipus de filtre correcte
  onOpenNewTask: () => void;
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
  onViewTask: (task: EnrichedTask) => void; // ✅ 6. Canviem al tipus EnrichedTask
  pendingCount: number;
  completedCount: number;
  attentionContacts: Tables<"contacts">[];
  overdueInvoices: (Tables<'invoices'> & { contacts: { nom: string } | null })[];
  notifications: Tables<"notifications">[];
  children: React.ReactNode;
  departments: Tables<'departments'>[];
  departmentFilter: number | 'all';
  onDepartmentFilterChange: (filter: number | 'all') => void;
  
  // ✅ 7. Afegim les props que falten per a la cerca i el comptador d'assignades
  assignedCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const DashboardBottomGrid = memo(
  ({
    tasks,
    activeFilter,
    onFilterChange,
    onToggleTask,

  onViewTask,
    pendingCount,
    completedCount,
    attentionContacts,
    overdueInvoices,
    notifications,
    children,
    departments,
    departmentFilter,
    onDepartmentFilterChange,
    // ✅ 8. Rebem les noves props
    assignedCount,
    searchTerm,
    onSearchChange,
  }: DashboardBottomGridProps) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 🗓️ Agenda de tasques */}
        <Agenda
          tasks={tasks}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onToggleTask={onToggleTask}
          // onOpenNewTask={onOpenNewTask} // Aquesta prop no l'espera Agenda, però no fa mal
          onViewTask={onViewTask}
          pendingCount={pendingCount}
          completedCount={completedCount}
          departments={departments}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={onDepartmentFilterChange}
          // ✅ 9. Passem les noves props al component Agenda
          assignedCount={assignedCount}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
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