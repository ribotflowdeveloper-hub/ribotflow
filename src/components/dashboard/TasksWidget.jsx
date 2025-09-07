"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from 'lucide-react';
import type { FC } from 'react';

// Tipus per a una tasca individual
type Task = {
  id: string;
  is_completed: boolean;
  title: string;
  contact_id?: string;
};

const TaskItem: FC<{ task: Task; onToggle: (id: string, status: boolean) => void }> = ({ task, onToggle }) => (
  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg transition-all hover:bg-white/10">
    <Checkbox
      id={`task-${task.id}`}
      checked={task.is_completed}
      onCheckedChange={() => onToggle(task.id, task.is_completed)}
      className="border-primary"
    />
    <label htmlFor={`task-${task.id}`} className={`flex-1 cursor-pointer ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
      {task.title}
    </label>
    {task.contact_id && <Link href="/contactes" className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20">Contacte</Link>}
  </div>
);

interface TasksWidgetProps {
  tasks: Task[];
  loading: boolean;
  onToggleTask: (id: string, status: boolean) => void;
  onAddTask: () => void;
}

const TasksWidget: FC<TasksWidgetProps> = ({ tasks, loading, onToggleTask, onAddTask }) => {
  const pendingTasks = tasks.filter(task => !task.is_completed);

  return (
    <div className="glass-effect rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold">⚡ L'Agenda de l'Aprenent</h2>
        <Button variant="ghost" size="sm" onClick={onAddTask}>
          <Plus className="w-4 h-4 mr-2" /> Nova Tasca
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregant tasques...</p>
          ) : pendingTasks.length > 0 ? (
            pendingTasks.map(task => <TaskItem key={task.id} task={task} onToggle={onToggleTask} />)
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No tens tasques pendents. Ben fet!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksWidget;