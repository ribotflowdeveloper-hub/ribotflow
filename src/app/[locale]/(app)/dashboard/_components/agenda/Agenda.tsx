"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from './TaskCard';
import { TaskWithContact } from '@/types/dashboard/types';
import { Tables } from '@/types/supabase';

interface AgendaProps {
  tasks: TaskWithContact[];
  activeFilter: 'pendents' | 'completes';
  onFilterChange: (filter: 'pendents' | 'completes') => void;
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
  onOpenNewTask: () => void;
  onViewTask: (task: TaskWithContact) => void;
  pendingCount: number;
  completedCount: number;
  departments: Tables<'departments'>[];
  departmentFilter: number | 'all';
  onDepartmentFilterChange: (filter: number | 'all') => void;
}

export function Agenda({
  tasks,
  activeFilter,
  onFilterChange,
  onToggleTask,
  onViewTask,
  pendingCount,
  completedCount,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
}: AgendaProps) {
  const t = useTranslations('DashboardClient.agenda');

  // ✅ CORRECCIÓ: Embolcallem tot en un sol 'div'.
  return (
    <div>
      {/* Contenidor per als filtres */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <ToggleGroup
          type="single"
          value={activeFilter}
          onValueChange={(value) => { if (value) onFilterChange(value as 'pendents' | 'completes'); }}
          className="grid grid-cols-2 flex-grow"
        >
          <ToggleGroupItem value="pendents" aria-label={t('filter.pendingAria')}>
            {t('pending')} <span className="ml-2 text-xs text-muted-foreground">({pendingCount})</span>
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
      
      {/* Llista de tasques */}
      <div className="space-y-3 overflow-y-auto pr-2 max-h-[480px]">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleTask={onToggleTask}
              onViewTask={onViewTask}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground text-center">
              {activeFilter === 'pendents' ? t('noPendingTasks') : t('noCompletedTasks')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}