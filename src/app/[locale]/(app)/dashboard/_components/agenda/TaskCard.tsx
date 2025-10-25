// src/app/[locale]/(app)/dashboard/_components/agenda/TaskCard.tsx (COMPLET I CORREGIT)

"use client";

import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Contact as ContactIcon, User as UserIcon, Building, ChevronDown, CheckSquare } from "lucide-react";
import { EnrichedTask } from '@/components/features/tasks/TaskDialogManager';
import { TaskPriority } from '@/config/styles/task';
import { Badge } from "@/components/ui/badge";
import parse, { domToReact, Element, DOMNode } from 'html-react-parser';
import { updateSimpleTask } from "@/app/actions/tasks/actions";
import { toast } from "sonner";
import { Tables, Json } from '@/types/supabase';

// --- Helpers ---

// Tipus explícit per a les entrades del log
type TimeTrackingLogEntry = { status?: 'active' | 'inactive'; action?: 'actiu' | 'inactiu'; timestamp: string; user_id?: string };

const calculateElapsedTime = (startTime: string): number => new Date().getTime() - new Date(startTime).getTime();

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

// Hook del temporitzador
const useTaskTimer = (task: EnrichedTask): string => {
    const [elapsedTime, setElapsedTime] = useState<number>(0);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (task.is_active && task.time_tracking_log && Array.isArray(task.time_tracking_log)) {
            const logArray: TimeTrackingLogEntry[] = task.time_tracking_log as unknown as TimeTrackingLogEntry[];

            const lastActiveLog = [...logArray]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .find(log => log.status === 'active' || log.action === 'actiu');

            if (lastActiveLog) {
                const startTime = lastActiveLog.timestamp;
                const updateElapsedTime = () => setElapsedTime(calculateElapsedTime(startTime));
                updateElapsedTime();
                intervalId = setInterval(updateElapsedTime, 1000);
            } else {
                setElapsedTime(0);
            }
        } else {
            setElapsedTime(0);
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
function MetaItem({ icon: Icon, text, className }: { icon: React.ElementType, text: React.ReactNode, className?: string }) {
    if (!text) return null;
    return (
        <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{text}</span>
        </div>
    );
}
const PriorityDot = ({ priority }: { priority: TaskPriority | null }) => {
    const colorClass = {
        'Alta': 'bg-red-500',
        'Mitjana': 'bg-yellow-500',
        'Baixa': 'bg-blue-500',
    }[priority || 'Baixa'];
    return <div className={cn("w-3 h-3 rounded-full flex-shrink-0", colorClass)} />;
}

// --- Funció Helper per Comptar Checkboxes ---
function countCheckboxesFromHtml(html: string): { total: number; completed: number } {
    if (!html) return { total: 0, completed: 0 };
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
        const total = taskItems.length;
        let completed = 0;
        taskItems.forEach(item => {
            if (item.getAttribute('data-checked') === 'true') {
                completed++;
            }
        });
        return { total, completed };
    } catch (error) {
        console.error("Error counting checkboxes from HTML:", error);
        return { total: 0, completed: 0 };
    }
}

// --- Component Principal ---
interface TaskCardProps {
    task: EnrichedTask;
    onViewTask: (task: EnrichedTask) => void;
    // ✅ Canvi: Passem la tasca sencera per tenir més context
    onToggleTask: (task: EnrichedTask) => void;
    onTaskMutation: () => void;
}

export function TaskCard({ task, onViewTask, onToggleTask, onTaskMutation }: TaskCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDescription, setCurrentDescription] = useState(task.description || '');

    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
    const formattedTimer = useTaskTimer(task);
    const userColor = generateHslColorFromString(task.user_asign_id);
    const cardStyle: React.CSSProperties = userColor ? {
        '--user-color-main': userColor.main,
        '--user-color-soft': userColor.soft,
        '--user-color-dark-soft': userColor.darkSoft
    } as React.CSSProperties : {};
    const progress = task.checklist_progress;
    const showProgress = progress && progress.total > 0;

    useEffect(() => {
        setCurrentDescription(task.description || '');
    }, [task.description]);

    const handleToggleTaskItem = useCallback(async (itemIndex: number) => {
        if (!currentDescription) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(currentDescription, 'text/html');
        const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');

        if (itemIndex < taskItems.length) {
            const item = taskItems[itemIndex];
            const isChecked = item.getAttribute('data-checked') === 'true';
            item.setAttribute('data-checked', isChecked ? 'false' : 'true');

            const newHtml = doc.body.innerHTML;
            const originalHtml = currentDescription;
            setCurrentDescription(newHtml);

            const newProgress = countCheckboxesFromHtml(newHtml);

            const updateData: Partial<Tables<'tasks'>> = {
                description: newHtml,
                checklist_progress: newProgress as unknown as Json
            };

            const result = await updateSimpleTask(task.id, updateData);

            if (result.error) {
                toast.error("No s'ha pogut actualitzar el checkbox.");
                setCurrentDescription(originalHtml);
            } else {
                onTaskMutation();
            }
        }
    }, [task.id, currentDescription, onTaskMutation]);

    let taskItemIndex = -1;
    const options = {
        replace: (domNode: DOMNode) => {
            if (domNode instanceof Element && domNode.attribs && domNode.attribs['data-type'] === 'taskItem') {
                taskItemIndex++;
                const currentIndex = taskItemIndex;
                const isChecked = domNode.attribs['data-checked'] === 'true';
                const contentDiv = domNode.children.find((child): child is Element => child instanceof Element && child.name === 'div');

                return (
                    <div onClick={(e) => e.stopPropagation()} className="flex items-start gap-3 my-2 first:mt-0 last:mb-0">
                        <Checkbox
                            id={`task-${task.id}-item-${currentIndex}`}
                            checked={isChecked}
                            onCheckedChange={() => handleToggleTaskItem(currentIndex)}
                            className="w-5 h-5 mt-1 flex-shrink-0"
                        />
                        <div className={cn("prose-sm max-w-none", isChecked && "line-through text-muted-foreground")}>
                            {contentDiv && domToReact(contentDiv.children as DOMNode[], options)}
                        </div>
                    </div>
                );
            }
            return undefined;
        }
    };

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
            <div className="flex items-center gap-3 p-3" onClick={() => !isOpen && onViewTask(task)}>
                <Checkbox
                    id={`task-${task.id}`}
                    // L'estat `checked` depèn de si la tasca està completada o si està assignada (pas intermedi)
                    checked={task.is_completed || !!task.user_asign_id}
                    // ✅ Canvi: Passem la tasca sencera a la funció onToggleTask
                    onCheckedChange={() => onToggleTask(task)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewTask(task); }}>
                    <div className="flex items-center gap-2">
                        <PriorityDot priority={task.priority} />
                        <h3 className={cn("text-md font-semibold leading-tight truncate", task.is_completed && "line-through text-muted-foreground")}>
                            {task.title}
                        </h3>
                    </div>
                </div>
                {showProgress && (
                    <div className="mt-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 flex items-center">
                            <CheckSquare className="w-3 h-3 mr-1" />
                            {progress.completed} / {progress.total}
                        </Badge>
                    </div>
                )}
                {task.is_active && (
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 flex-shrink-0">
                        <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>
                        <span className="font-mono text-sm font-semibold">{formattedTimer}</span>                    </div>
                )}
                <TooltipProvider delayDuration={150}>
                    <Tooltip>
                        <TooltipTrigger onClick={(e) => e.stopPropagation()}><Avatar className="w-8 h-8 border-2 border-white dark:border-slate-800"><AvatarImage src={task.profiles?.avatar_url || undefined} /><AvatarFallback className="text-xs font-bold">{task.profiles ? task.profiles.full_name?.charAt(0) : <UserIcon className="w-4 h-4" />}</AvatarFallback></Avatar></TooltipTrigger>
                        <TooltipContent><p>{task.profiles ? `Assignat a ${task.profiles.full_name}` : 'Sense assignar'}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                        <ChevronDown className={cn("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
                <div className="border-t-2 border-black/5 dark:border-white/5 p-4 space-y-3">
                    {currentDescription && (
                        <div className="prose dark:prose-invert prose-sm max-w-none text-muted-foreground">
                            {(() => { taskItemIndex = -1; return parse(currentDescription, options); })()}
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-3 border-t pt-3">
                        <div className="flex items-center gap-4 flex-wrap">
                            {task.contacts && <MetaItem icon={ContactIcon} text={task.contacts.nom} />}
                            {task.departments && <MetaItem icon={Building} text={task.departments.name} />}
                        </div>
                        {dueDate && (
                            <MetaItem
                                icon={Calendar}
                                text={format(dueDate, "d MMM", { locale: es })}
                                className={cn('font-semibold flex-shrink-0', { 'text-red-600 dark:text-red-400': isOverdue, 'text-orange-600 dark:text-orange-400': isToday(dueDate) })}
                            />
                        )}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}