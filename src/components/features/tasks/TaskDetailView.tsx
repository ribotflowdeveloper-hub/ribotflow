'use client';

import { useState, useEffect, useCallback } from 'react';
import { EnrichedTask } from './TaskDialogManager';
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Flag, User, CheckCircle2, Trash2, RotateCcw, Pencil, Building, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteTask, updateSimpleTask, setTaskActiveStatus } from '@/app/actions/tasks/actions';
import { toast } from 'sonner';
import { priorityStyles, TaskPriority } from '@/config/styles/task';
import parse, { domToReact, Element, DOMNode } from 'html-react-parser';

type LogEntry = { timestamp: string; action: 'actiu' | 'inactiu'; user_id: string; status?: 'active' | 'inactive' };

// --- HOOK PER AL CRONÒMETRE EN TEMPS REAL ---
const useDialogTaskTimer = (task: EnrichedTask, localLog: LogEntry[] | null) => {
    const [liveTime, setLiveTime] = useState("00:00:00");

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        const calculateTotalTime = () => {
            if (!localLog || !Array.isArray(localLog)) return 0;
            
            let totalMs = 0;
            let startTime: number | null = null;
            
            const sortedLog = [...localLog].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            for (const entry of sortedLog) {
                if ((entry.action === 'actiu' || entry.status === 'active') && startTime === null) {
                    startTime = new Date(entry.timestamp).getTime();
                } else if ((entry.action === 'inactiu' || entry.status === 'inactive') && startTime !== null) {
                    totalMs += (new Date(entry.timestamp).getTime() - startTime);
                    startTime = null;
                }
            }

            // Si la tasca encara està activa, afegim el temps des de l'últim 'actiu' fins ara
            if (task.is_active && startTime !== null) {
                totalMs += (new Date().getTime() - startTime);
            }
            return totalMs;
        };

        const updateTimer = () => {
            const totalMs = calculateTotalTime();
            const totalSeconds = Math.floor(totalMs / 1000);
            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(totalSeconds % 60).padStart(2, '0');
            setLiveTime(`${h}:${m}:${s}`);
        };

        updateTimer(); // Càlcul inicial

        if (task.is_active) {
            intervalId = setInterval(updateTimer, 1000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [task.is_active, localLog]);

    return liveTime;
};


function DetailItem({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) {
    if (!children) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold">{children}</span>
            </div>
        </div>
    );
}

interface TaskDetailViewProps {
    task: EnrichedTask;
    onSetEditMode: () => void;
    onTaskMutation: (options?: { closeDialog?: boolean }) => void;
    onClose: () => void;
}

export function TaskDetailView({ task, onSetEditMode, onTaskMutation, onClose }: TaskDetailViewProps) {
    const t = useTranslations('DashboardClient.taskActions');
    const t2 = useTranslations('DashboardClient.taskDetails');
    
    const [isActive, setIsActive] = useState(task.is_active || false);
    const [localLog, setLocalLog] = useState(task.time_tracking_log as LogEntry[] | null);
    const [currentDescription, setCurrentDescription] = useState(task.description || '');

    const liveTimeDisplay = useDialogTaskTimer(task, localLog); // <-- Ús del nou hook

    useEffect(() => {
        setIsActive(task.is_active || false);
        setLocalLog(task.time_tracking_log as LogEntry[] | null);
        setCurrentDescription(task.description || '');
    }, [task]);

    const handleToggleActive = async (newCheckedState: boolean) => {
        const previousState = isActive;
        setIsActive(newCheckedState); 

        const previousLog = localLog; 
        const newLogEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            action: newCheckedState ? 'actiu' : 'inactiu',
            user_id: 'optimistic_placeholder' 
        };
        setLocalLog([...(localLog || []), newLogEntry]);

        const { error } = await setTaskActiveStatus(task.id, newCheckedState);

        if (error) {
            setIsActive(previousState);
            setLocalLog(previousLog); 
            toast.error("No s'ha pogut actualitzar l'estat.", { description: "Si us plau, intenta-ho de nou." });
        } else {
            toast.success(newCheckedState ? "Tasca activada." : "Tasca desactivada.");
            onTaskMutation({ closeDialog: false });
        }
    };

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
            setCurrentDescription(newHtml);
            
            const { error } = await updateSimpleTask(task.id, { description: newHtml });

            if (error) {
                toast.error("No s'ha pogut actualitzar la llista de tasques.");
                setCurrentDescription(task.description || ''); 
            } else {
                onTaskMutation({ closeDialog: false });
            }
        }
    }, [task.id, currentDescription, onTaskMutation, task.description]);

    let taskItemIndex = -1;
    const options = {
        replace: (domNode: DOMNode) => {
            if (domNode instanceof Element && domNode.attribs && domNode.attribs['data-type'] === 'taskItem') {
                taskItemIndex++;
                const currentIndex = taskItemIndex;
                const isChecked = domNode.attribs['data-checked'] === 'true';
                
                const contentDiv = domNode.children.find(
                    (child): child is Element => child instanceof Element && child.name === 'div'
                );
                
                return (
                    <div className="flex items-start gap-3 my-2 first:mt-0 last:mb-0">
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleTaskItem(currentIndex)}
                            className="w-5 h-5 mt-1"
                        />
                        <div className={cn("prose prose-sm dark:prose-invert max-w-none", isChecked && "line-through text-muted-foreground")}>
                            {contentDiv && domToReact(contentDiv.children as DOMNode[], options)}
                        </div>
                    </div>
                );
            }
        }
    };

    const handleToggle = async () => {
        const isCompleting = !task.is_completed;
        const updateData = {
            is_completed: isCompleting,
            finish_date: isCompleting ? new Date().toISOString() : null,
        };
        const { error } = await updateSimpleTask(task.id, updateData);
        if (error) {
            toast.error(t('toast.errorTitle'), { description: "No s'ha pogut actualitzar la tasca." });
        } else {
            toast.success("Estat de la tasca actualitzat.");
            onTaskMutation({ closeDialog: false });
        }
    };

    const handleDelete = async () => {
        const { error } = await deleteTask(task.id);
        if (error) {
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : 'Error desconegut';
            toast.error(t('toast.deleteErrorTitle'), { description: errorMessage });
        } else {
            toast.success(t('toast.deleteSuccessTitle'));
            onTaskMutation(); 
            onClose(); 
        }
    };

    return (
        <>
            <DialogHeader className="pr-16 pb-4 border-b">
                <DialogTitle className="text-2xl font-bold leading-tight flex items-center gap-3">
                    <div className={cn("w-4 h-4 rounded-full flex-shrink-0")} style={{backgroundColor: priorityStyles[task.priority as TaskPriority]?.hexColor}} />
                    {task.title}
                </DialogTitle>
                <Badge variant="outline" className={cn("absolute top-6 right-6 text-sm py-1 px-3", priorityStyles[task.priority as TaskPriority]?.badgeClasses)}>
                    <Flag className="w-3.5 h-3.5 mr-2" /> {task.priority}
                </Badge>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 max-h-[65vh] overflow-y-auto pr-2">
                {/* Columna Esquerra: Descripció i detalls */}
                <div className="md:col-span-2 space-y-6">
                    {currentDescription && (
                        <div className='max-w-none'>
                            {parse(currentDescription, options)}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-sm border-t pt-6">
                        <DetailItem icon={Calendar} label={t2('limitDay')}>{task.due_date && format(new Date(task.due_date), "d MMM yyyy 'a les' HH:mm", { locale: es })}</DetailItem>
                        <DetailItem icon={Building} label="Departament">{task.departments?.name}</DetailItem>
                        <DetailItem icon={User} label={t2('assignedTo')}>{task.profiles?.full_name || 'Sense assignar'}</DetailItem>
                        <DetailItem icon={User} label="Contacte associat">{task.contacts?.nom}</DetailItem>
                    </div>
                </div>

                {/* Columna Dreta: Estat i Temps */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                        <div>
                            <Label htmlFor="task-status-active" className="text-sm text-muted-foreground mb-2 block">Estat de la Tasca</Label>
                            <div className="flex items-center space-x-3">
                                <Switch id="task-status-active" checked={isActive} onCheckedChange={handleToggleActive} />
                                <span className={cn("font-bold text-lg", isActive ? "text-green-600" : "text-foreground")}>{isActive ? 'Activa' : 'Inactiva'}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <Label className="text-sm text-muted-foreground">TEMPS TOTAL IMPUTAT</Label>
                            <div className="flex items-center justify-center gap-2 text-4xl font-mono font-bold text-foreground mt-2">
                                <Clock className="w-7 h-7 text-muted-foreground" />
                                <span>{liveTimeDisplay}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 border-t pt-4">
                <div>
                    <Button variant="ghost" onClick={onSetEditMode}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                </div>
                <div className='flex items-center gap-2'>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t2('cancelButton')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {t('deleteConfirmAction')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {task.is_completed ? (
                        <Button variant="outline" onClick={handleToggle}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t2('markAsPendingButton')}
                        </Button>
                    ) : (
                        <Button onClick={handleToggle} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t2('markAsCompletedButton')}
                        </Button>
                    )}
                </div>
            </DialogFooter>
        </>
    );
}