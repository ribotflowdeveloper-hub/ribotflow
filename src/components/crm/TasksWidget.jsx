import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from 'lucide-react';

const TaskItem = ({ task, onToggle }) => (
  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg transition-all hover:bg-white/10">
    <Checkbox
      id={`task-${task.id}`}
      checked={task.is_completed}
      onCheckedChange={() => onToggle(task.id, task.is_completed)}
      className="border-primary"
    />
    <label
      htmlFor={`task-${task.id}`}
      className={`flex-1 cursor-pointer ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}
    >
      {task.title}
    </label>
    {task.contact_id && <Link to="/crm" className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20">CRM</Link>}
  </div>
);

const TasksWidget = ({ tasks, loading, onToggleTask, onAddTask }) => {
  const pendingTasks = tasks.filter(task => !task.is_completed);
  const completedTasks = tasks.filter(task => task.is_completed);

  return (
    <div className="lg:col-span-2 glass-effect rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">El Teu Dia Màgic ✨</h2>
        <Button variant="ghost" size="sm" onClick={onAddTask}>
          <Plus className="w-4 h-4 mr-2" /> Nova Tasca
        </Button>
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold text-primary">Tasques Pendents</h3>
        <div className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Carregant tasques...</p> :
           pendingTasks.length > 0 ? pendingTasks.map(task => <TaskItem key={task.id} task={task} onToggle={onToggleTask} />) :
           <p className="text-sm text-muted-foreground py-4 text-center">Enhorabona! No tens tasques pendents.</p>}
        </div>

        {completedTasks.length > 0 && (
          <div className="pt-4 mt-4 border-t border-border">
            <h3 className="font-semibold text-primary">Tasques Completades</h3>
            <div className="space-y-3 mt-4">
              {completedTasks.map(task => <TaskItem key={task.id} task={task} onToggle={onToggleTask} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksWidget;