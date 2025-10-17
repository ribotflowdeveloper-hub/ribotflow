"use client";

import { useState, useEffect } from "react"; // ✅ 1. Importem useState i useEffect
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
    const h = hash % 220;
    return { h, s: 60, l: 75 };
};

function MetaItem({ icon: Icon, text, className }: { icon: React.ElementType, text: React.ReactNode, className?: string }) {
    if (!text) return null;
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
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
    ? {
        backgroundColor: `hsla(${userColor.h}, ${userColor.s}%, ${userColor.l}%, 0.15)`,
        borderColor: `hsla(${userColor.h}, ${userColor.s}%, ${userColor.l}%, 0.4)`,
      }
    : {};
  
  // ✅ 2. Creem un estat per a la descripció, inicialitzat a buit
  const [plainTextDescription, setPlainTextDescription] = useState('');

  // ✅ 3. Utilitzem useEffect per processar l'HTML només al client
  useEffect(() => {
    // Aquesta funció només s'executarà al navegador, després del primer render
    setPlainTextDescription(sanitizeHtml(task.description));
  }, [task.description]); // Es tornarà a executar si la descripció de la tasca canvia

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors group hover:bg-muted/50"
      style={cardStyle}
    >
      
      <div className="pt-1">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.is_completed}
            onCheckedChange={() => onToggleTask(task.id, task.is_completed)}
            onClick={(e) => e.stopPropagation()}
          />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer space-y-2" onClick={() => onViewTask(task)}>
        
        <div className="flex justify-between items-start gap-2">
            <p className={cn("font-semibold leading-tight break-words pr-2", task.is_completed && "line-through text-muted-foreground")}>
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
                        <TooltipTrigger>
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

        <div className="space-y-2 text-muted-foreground">
            {/* ✅ 4. Mostrem la descripció des de l'estat */}
            {plainTextDescription && (
              <p className="text-sm truncate">
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