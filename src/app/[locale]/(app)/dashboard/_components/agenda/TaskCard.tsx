"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, sanitizeHtml } from "@/lib/utils/utils";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Contact as ContactIcon, User as UserIcon, Clock, Building } from "lucide-react";
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { priorityStyles, TaskPriority } from '@/config/styles/task';

interface TaskCardProps {
  task: EnrichedTask;
  onViewTask: (task: EnrichedTask) => void;
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
}

const generateHslColorFromString = (str: string | null | undefined) => {
    if (!str) return null;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return { h, s: 60, l: 55 }; // Ajustem la lluminositat per a millor contrast
};

function MetaItem({ icon: Icon, text, className }: { icon: React.ElementType, text: React.ReactNode, className?: string }) {
    if (!text) return null;
    return (
        <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{text}</span>
        </div>
    );
}

export function TaskCard({ task, onViewTask, onToggleTask }: TaskCardProps) {
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);

  const dueDateColor = cn({
    "text-red-500 dark:text-red-400 font-semibold": isOverdue,
    "text-orange-500 dark:text-orange-400 font-semibold": dueDate && isToday(dueDate),
  });

  const userColor = generateHslColorFromString(task.user_asign_id);
  const cardStyle = userColor
    ? { borderLeftColor: `hsla(${userColor.h}, ${userColor.s}%, ${userColor.l}%, 1)` }
    : { borderLeftColor: 'var(--border)' };
  
  const [plainTextDescription, setPlainTextDescription] = useState('');

  useEffect(() => {
    setPlainTextDescription(sanitizeHtml(task.description));
  }, [task.description]);

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg bg-background border-l-4 transition-all duration-200 group hover:bg-muted/80 cursor-pointer shadow-sm"
      style={cardStyle}
      onClick={() => onViewTask(task)}
    >
      <div className="pt-1">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.is_completed}
          onCheckedChange={() => onToggleTask(task.id, task.is_completed)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex justify-between items-start gap-2">
            <p className={cn("font-semibold leading-tight break-words pr-2 text-card-foreground", task.is_completed && "line-through text-muted-foreground")}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                {task.priority && (
                  <Badge variant="outline" className={cn("text-xs py-0.5 px-2", priorityStyles[task.priority as TaskPriority].badgeClasses)}>
                    {task.priority}
                  </Badge>
                )}
                <TooltipProvider delayDuration={150}>
                    <Tooltip>
                        <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                            <Avatar className="w-6 h-6 border">
                                <AvatarImage src={task.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                    {task.profiles ? task.profiles.full_name?.charAt(0) : <UserIcon className="w-3 h-3" />}
                                </AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{task.profiles ? `Assignat a ${task.profiles.full_name}` : 'Sense assignar'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>

        <div className="space-y-2">
            {plainTextDescription && (
              <p className="text-sm truncate text-muted-foreground">
                {plainTextDescription}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {task.departments && <MetaItem icon={Building} text={task.departments.name} />}
                {dueDate && <MetaItem icon={Calendar} text={format(dueDate, "d MMM yyyy", { locale: es })} className={dueDateColor} />}
                {task.contacts && <MetaItem icon={ContactIcon} text={task.contacts.nom} />}
                {task.duration && task.duration > 0 && <MetaItem icon={Clock} text={`${task.duration} min`} />}
            </div>
        </div>
      </div>
    </div>
  );
}