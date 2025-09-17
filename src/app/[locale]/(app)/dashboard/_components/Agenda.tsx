/**
 * @file Agenda.tsx
 * @summary Renderitza la secció d'agenda amb les tasques pendents.
 */
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import type { Task } from '../types';

interface AgendaProps {
  pendingTasks: Task[];
  onToggleTask: (taskId: string, currentStatus: boolean) => void;
  onOpenNewTask: () => void;
}

export function Agenda({ pendingTasks, onToggleTask, onOpenNewTask }: AgendaProps) {
  const t = useTranslations('DashboardClient');

  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{t('agenda')}</h2>
        <Button variant="ghost" size="sm" onClick={onOpenNewTask}>
          <Plus className="w-4 h-4 mr-2" /> {t('newTask')}
        </Button>
      </div>
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {pendingTasks.length > 0 ? (
          pendingTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <Checkbox 
                id={`task-${task.id}`} 
                checked={task.is_completed} 
                onCheckedChange={() => onToggleTask(task.id, task.is_completed)} 
              />
              <label 
                htmlFor={`task-${task.id}`} 
                className={`flex-1 cursor-pointer ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}
              >
                {task.title}
              </label>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noPendingTasks')}</p>
        )}
      </div>
    </div>
  );
}