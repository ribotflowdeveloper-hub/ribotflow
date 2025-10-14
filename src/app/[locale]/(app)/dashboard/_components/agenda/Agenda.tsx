"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid, Search } from 'lucide-react'; // Importem la icona de cerca
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input'; // Importem el component Input
import { TaskCard } from './TaskCard';
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { Tables } from '@/types/supabase';

// Definim el nou tipus per al filtre actiu
export type TaskFilterStatus = 'pendents' | 'assignades' | 'completes';

interface AgendaProps {
  tasks: EnrichedTask[];
  activeFilter: TaskFilterStatus; // ✅ Canviat al nou tipus
  onFilterChange: (filter: TaskFilterStatus) => void;
  onViewTask: (task: EnrichedTask) => void;
  pendingCount: number;
  assignedCount: number; // ✅ Nou comptador per a les tasques assignades
  completedCount: number;
  departments: Tables<'departments'>[];
  departmentFilter: number | 'all';
  onDepartmentFilterChange: (filter: number | 'all') => void;
  searchTerm: string; // ✅ Nova prop per al terme de cerca
  onSearchChange: (term: string) => void; // ✅ Nova prop per a gestionar canvis a la cerca
  onToggleTask: (taskId: number, currentStatus: boolean) => void; // ✅ Afegeix aquesta prop

}

export function Agenda({
  tasks,
  activeFilter,
  onFilterChange,
  onViewTask,
  pendingCount,
  assignedCount, // Nou
  completedCount,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
  searchTerm, // Nou
  onSearchChange, // Nou
  onToggleTask
}: AgendaProps) {
  const t = useTranslations('DashboardClient.agenda');

  return (
    <div>
      {/* Grup de botons de filtre */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <ToggleGroup
          type="single"
          value={activeFilter}
          onValueChange={(value) => { if (value) onFilterChange(value as TaskFilterStatus); }}
          className="grid grid-cols-3 flex-grow" // ✅ Canviat a 3 columnes
        >
          <ToggleGroupItem value="pendents" aria-label={t('filter.pendingAria')}>
            {t('pending')} <span className="ml-2 text-xs text-muted-foreground">({pendingCount})</span>
          </ToggleGroupItem>

          {/* ✅ NOU BOTÓ "ASSIGNADES" */}
          <ToggleGroupItem value="assignades" aria-label={t('filter.assignedAria')}>
            {t('assigned')} <span className="ml-2 text-xs text-muted-foreground">({assignedCount})</span>
          </ToggleGroupItem>

          <ToggleGroupItem value="completes" aria-label={t('filter.completedAria')}>
            {t('completed')} <span className="ml-2 text-xs text-muted-foreground">({completedCount})</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Select
          value={String(departmentFilter)}
          onValueChange={(value) => onDepartmentFilterChange(value === 'all' ? 'all' : Number(value))}
        >
          <SelectTrigger className="w-auto sm:w-[180px]">
            <LayoutGrid className="w-4 h-4 mr-2 text-muted-foreground hidden sm:block" />
            <SelectValue placeholder={t('filter.departmentPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allDepartments')}</SelectItem>
            {departments.map(dep => (
              <SelectItem key={dep.id} value={String(dep.id)}>{dep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ✅ NOU CAMP DE CERCA */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {/* Llista de tasques (la lògica no canvia) */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onViewTask={onViewTask}
              onToggleTask={onToggleTask} // ✅ Passa la funció a la TaskCard

            />
          ))
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground text-center">
              {t('noTasksFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}