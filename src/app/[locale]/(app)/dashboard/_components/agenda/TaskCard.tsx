"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn, sanitizeHtml } from "@/lib/utils/utils";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Contact as ContactIcon, User as UserIcon, Building, ChevronDown } from "lucide-react";
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { TaskPriority } from '@/config/styles/task';

// --- Helpers (Es mantenen iguals) ---
const calculateElapsedTime = (startTime: string): number => new Date().getTime() - new Date(startTime).getTime();
const formatDuration = (ms: number): string => { /* ... (mateixa implementació) */ 
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};
const useTaskTimer = (task: EnrichedTask): string => { /* ... (mateixa implementació) */ 
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (task.is_active && task.time_tracking_log) {
            type TimeTrackingLog = { status?: string; action?: string; timestamp: string; };
            const lastActiveLog = [...task.time_tracking_log].reverse().find((log: TimeTrackingLog) => log.status === 'active' || log.action === 'actiu');
            if (lastActiveLog) {
                const startTime = lastActiveLog.timestamp;
                setElapsedTime(calculateElapsedTime(startTime));
                intervalId = setInterval(() => {
                    setElapsedTime(calculateElapsedTime(startTime));
                }, 1000);
            }
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [task.is_active, task.time_tracking_log]);
    return formatDuration(elapsedTime);
};
const generateHslColorFromString = (str: string | null | undefined) => {
    if (!str) return null;
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = hash % 360;
    return {
        main: `hsl(${h}, 70%, 50%)`,
        soft: `hsl(${h}, 80%, 95%)`,
        darkSoft: `hsl(${h}, 80%, 10%)`
    };
};

// --- Components UI ---
function MetaItem({ icon: Icon, text, className }: { icon: React.ElementType, text: React.ReactNode, className?: string }) { /* ... (mateixa implementació) */ 
    if (!text) return null;
    return (
        <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{text}</span>
        </div>
    );
}
const PriorityDot = ({ priority }: { priority: TaskPriority | null }) => { /* ... (mateixa implementació) */ 
    const colorClass = {
        'Alta': 'bg-red-500',
        'Mitjana': 'bg-yellow-500',
        'Baixa': 'bg-blue-500',
    }[priority || 'Baixa'];
    return <div className={cn("w-3 h-3 rounded-full flex-shrink-0", colorClass)} />;
}

// --- Component Principal ---
interface TaskCardProps {
  task: EnrichedTask;
  onViewTask: (task: EnrichedTask) => void;
  onToggleTask: (taskId: number, currentStatus: boolean) => void;
}

export function TaskCard({ task, onViewTask, onToggleTask }: TaskCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const formattedTimer = useTaskTimer(task);
  
  const [plainTextDescription, setPlainTextDescription] = useState('');
  useEffect(() => {
    setPlainTextDescription(sanitizeHtml(task.description));
  }, [task.description]);

  const userColor = generateHslColorFromString(task.user_asign_id);
  const cardStyle: React.CSSProperties = userColor ? {
      '--user-color-main': userColor.main,
      '--user-color-soft': userColor.soft,
      '--user-color-dark-soft': userColor.darkSoft
  } as React.CSSProperties : {};

  return (
    <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn(
            "relative rounded-lg border-l-4 shadow-md transition-all duration-300 group",
            "bg-[var(--user-color-soft)] border-[var(--user-color-main)] dark:bg-[var(--user-color-dark-soft)]",
            task.is_completed && 'bg-gray-100 dark:bg-gray-800/50 opacity-70'
        )}
        style={cardStyle}
    >
        <div className="flex items-center gap-3 p-3">
            <Checkbox
                id={`task-${task.id}`}
                checked={task.is_completed}
                onCheckedChange={() => onToggleTask(task.id, task.is_completed)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5"
            />
            
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewTask(task)}>
                <div className="flex items-center gap-2">
                    <PriorityDot priority={task.priority} />
                    <h3 className={cn("text-md font-semibold leading-tight truncate", task.is_completed && "line-through text-muted-foreground")}>
                        {task.title}
                    </h3>
                </div>
            </div>
            
            {task.is_active && (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 flex-shrink-0">
                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>
                    <span className="font-mono text-sm font-semibold">{formattedTimer.substring(0, 5)}</span>
                </div>
            )}
            
            <TooltipProvider delayDuration={150}>
                <Tooltip>
                    <TooltipTrigger onClick={(e) => e.stopPropagation()}><Avatar className="w-8 h-8 border-2 border-white dark:border-slate-800"><AvatarImage src={task.profiles?.avatar_url || undefined} /><AvatarFallback className="text-xs font-bold">{task.profiles ? task.profiles.full_name?.charAt(0) : <UserIcon className="w-4 h-4" />}</AvatarFallback></Avatar></TooltipTrigger>
                    <TooltipContent><p>{task.profiles ? `Assignat a ${task.profiles.full_name}` : 'Sense assignar'}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                    <ChevronDown className={cn("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
                </Button>
            </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
            <div className="border-t-2 border-black/5 dark:border-white/5 p-4 space-y-3">
                {plainTextDescription && <p className="text-sm text-muted-foreground">{plainTextDescription}</p>}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {task.contacts && <MetaItem icon={ContactIcon} text={task.contacts.nom} />}
                        {task.departments && <MetaItem icon={Building} text={task.departments.name} />}
                    </div>
                    {dueDate && (
                        <MetaItem 
                            icon={Calendar} 
                            text={format(dueDate, "d MMM", { locale: es })} 
                            className={cn('font-semibold', {'text-red-600 dark:text-red-400': isOverdue, 'text-orange-600 dark:text-orange-400': isToday(dueDate)})} 
                        />
                    )}
                </div>
            </div>
        </CollapsibleContent>
    </Collapsible>
  );
}