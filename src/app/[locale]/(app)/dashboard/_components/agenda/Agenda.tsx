"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid } from 'lucide-react'; // Importem nova icona
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importem Select
import { TaskCard } from './TaskCard';
import { TaskWithContact } from '@/types/dashboard/types'; // ✅ Importem el nostre tipus 
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
  onOpenNewTask,
  onViewTask,
  pendingCount,
  completedCount,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
}: AgendaProps) {
  const t = useTranslations('DashboardClient.agenda');

  return (
    <div className="rounded-2xl p-6 ring-1 ring-border bg-card lg:col-span-2 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
        <Button variant="ghost" size="sm" onClick={onOpenNewTask}>
          <Plus className="w-4 h-4 mr-2" /> {t('newTask')}
        </Button>
      </div>

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

        {/* ✅ NOU FILTRE DE DEPARTAMENTS */}
        <Select
          value={String(departmentFilter)}
          onValueChange={(value) => onDepartmentFilterChange(value === 'all' ? 'all' : Number(value))}
        >
          <SelectTrigger className="w-[180px]">
            <LayoutGrid className="w-4 h-4 mr-2 text-muted-foreground" />
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
      {/* ✅ CORRECCIÓ: Hem eliminat 'flex-1' i hem afegit una alçada màxima fixa */}
      <div className="space-y-3 overflow-y-auto pr-1 max-h-[580px]">
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
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <p className="text-sm text-muted-foreground text-center py-4">
              {activeFilter === 'pendents' ? t('noPendingTasks') : t('noCompletedTasks')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}