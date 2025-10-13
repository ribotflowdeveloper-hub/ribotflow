"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { TaskPriority } from "@/types/dashboard/types";
import { Calendar, User } from "lucide-react"; // ✅ 'Flag' eliminat
import { TaskWithContact } from "@/types/dashboard/types"; // ✅ Importem el nostre tipus

interface TaskCardProps {
  task: TaskWithContact; // ✅ Utilitzem el nostre tipus centralitzat
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
  onViewTask: (task: TaskCardProps['task']) => void; // Per al Pas 4
}

const priorityStyles: Record<TaskPriority, string> = {
  Baixa: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Mitjana: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Alta: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function TaskCard({ task, onToggleTask, onViewTask }: TaskCardProps) {
  const hasDueDate = task.due_date;
  const dueDate = hasDueDate ? new Date(task.due_date!) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);

  const dueDateColor = cn({
    "text-red-500": isOverdue,
    "text-orange-500": dueDate && isToday(dueDate),
    "text-muted-foreground": !isOverdue && !(dueDate && isToday(dueDate)),
  });

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.is_completed}
        onCheckedChange={() => onToggleTask(task.id, task.is_completed)}
        className="mt-1"
      />
      <div className="flex-1 cursor-pointer" onClick={() => onViewTask(task)}>
        <p className={cn("font-medium leading-none", task.is_completed && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        {/* Mostrem la descripció si existeix */}
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {hasDueDate && dueDate && (
            <div className={cn("flex items-center gap-1.5", dueDateColor)}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(dueDate, "d MMM", { locale: es })}</span>
            </div>
          )}
          {/* ✅ CORRECCIÓ: Mostrem el nom del contacte */}
          {task.contacts && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{task.contacts.nom}</span>
            </div>
          )}
        </div>
      </div>

  
      {task.departments && (
        <Badge variant="secondary" className={undefined}>{task.departments.name}</Badge>
      )}
      {task.priority && (
        <Badge variant="outline" className={cn("text-xs", priorityStyles[task.priority])}>
          {task.priority}
        </Badge>
      )}
    </div>
  );
}