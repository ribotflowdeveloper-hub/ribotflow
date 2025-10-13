"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TaskCard } from './TaskCard';
import { TaskWithContact } from '@/types/dashboard/types'; // ✅ Importem el nostre tipus centralitzat  

interface AgendaProps {
  tasks: TaskWithContact[];
  activeFilter: 'pendents' | 'completes';
  onFilterChange: (filter: 'pendents' | 'completes') => void;
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
  onOpenNewTask: () => void;
  onViewTask: (task: TaskWithContact) => void;
  pendingCount: number;
  completedCount: number;
}

export function Agenda({ 
  tasks, 
  activeFilter, 
  onFilterChange, 
  onToggleTask, 
  onOpenNewTask, 
  onViewTask, 
  pendingCount, 
  completedCount 
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

      <ToggleGroup
        type="single"
        value={activeFilter}
        onValueChange={(value) => { if (value) onFilterChange(value as 'pendents' | 'completes'); }}
        className="mb-4 w-full grid grid-cols-2 flex-shrink-0"
      >
        <ToggleGroupItem value="pendents" aria-label="Veure pendents">
          {t('pending')} <span className="ml-2 text-xs text-muted-foreground">({pendingCount})</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="completes" aria-label="Veure completes">
          {t('completed')} <span className="ml-2 text-xs text-muted-foreground">({completedCount})</span>
        </ToggleGroupItem>
      </ToggleGroup>

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