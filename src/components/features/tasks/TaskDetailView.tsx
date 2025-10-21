'use client';

// Importem 'useMemo'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { EnrichedTask } from './TaskDialogManager';
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from "@/lib/utils/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
// Importem 'Clock'
import { Calendar, Flag, User, CheckCircle2, Trash2, RotateCcw, Pencil, Contact, Building, Activity, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { deleteTask, updateSimpleTask,setTaskActiveStatus } from '@/app/actions/tasks/actions';
import { toast } from 'sonner';
import { priorityStyles, TaskPriority } from '@/config/styles/task';
import parse, { domToReact, Element, DOMNode } from 'html-react-parser';

// Tipus per a les entrades del log
type LogEntry = {
    timestamp: string;
    action: 'actiu' | 'inactiu';
    user_id: string;
};

interface TaskDetailViewProps {
    task: EnrichedTask;
    onSetEditMode: () => void;
    onTaskMutation: (options?: { closeDialog?: boolean }) => void;
    onClose: () => void;
}

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

export function TaskDetailView({ task, onSetEditMode, onTaskMutation, onClose }: TaskDetailViewProps) {
    const t = useTranslations('DashboardClient.taskActions');
    const t2 = useTranslations('DashboardClient.taskDetails');

    const [isActive, setIsActive] = useState(task.is_active || false);
    const [currentDescription, setCurrentDescription] = useState(task.description || '');
    
    // --- CANVI CLAU 1 ---
    // Creem un estat local pel log, inicialitzat amb el de la tasca.
    const [localLog, setLocalLog] = useState(task.time_tracking_log as LogEntry[] | null);

    useEffect(() => {
        setCurrentDescription(task.description || '');
    }, [task.description]);

    useEffect(() => {
        setIsActive(task.is_active || false);
    }, [task.is_active]);

    // --- CANVI CLAU 2 ---
    // Sincronitzem el log local si la 'task' (prop) canvia des del pare.
    useEffect(() => {
        setLocalLog(task.time_tracking_log as LogEntry[] | null);
    }, [task.time_tracking_log]);


    // Helper per formatar milisegons a HH:MM:SS
    const formatMsToHHMMSS = (ms: number) => {
        if (ms <= 0) return "00:00:00";

        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num: number) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    // --- CANVI CLAU 3 ---
    // El càlcul de temps ara depèn del 'localLog', no de 'task.time_tracking_log'.
    const { activeTimeDisplay } = useMemo(() => {
        const log = localLog; // <-- Llegeix de l'estat local

        if (!log || !Array.isArray(log) || log.length < 2) {
            return { activeTimeDisplay: "00:00:00", totalActiveMs: 0 };
        }

        const sortedLog = [...log].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let totalMs = 0;
        let startTime: number | null = null;

        for (const entry of sortedLog) {
            if (entry.action === 'actiu' && startTime === null) {
                startTime = new Date(entry.timestamp).getTime();
            } 
            else if (entry.action === 'inactiu' && startTime !== null) {
                const endTime = new Date(entry.timestamp).getTime();
                totalMs += (endTime - startTime);
                startTime = null; 
            }
        }
        
        return { 
            activeTimeDisplay: formatMsToHHMMSS(totalMs), 
            totalActiveMs: totalMs // Aquest totalMs ja és el correcte!
        };
    }, [localLog]); // <-- Depèn de l'estat local

    // --- CANVI CLAU 4 ---
    // Ja no necessitem 'displayedTime' ni 'totalActiveMs' separats.
    // El 'useMemo' (activeTimeDisplay) és ara la nostra font de veritat.
    // Hem eliminat el 'useState' i 'useEffect' per a 'displayedTime'.


    // --- CANVI CLAU 5 ---
    // Simplifiquem 'handleToggleActive' per actualitzar l'estat local del log.
    const handleToggleActive = async (newCheckedState: boolean) => {
        const previousState = isActive;
        setIsActive(newCheckedState); // 1. Actualització optimista de la UI

        const previousLog = localLog; // Guardem el log anterior per si cal revertir

        // 2. Creem una nova entrada de log optimista
        const newLogEntry: LogEntry = {
            timestamp: new Date().toISOString(), // Hora actual
            action: newCheckedState ? 'actiu' : 'inactiu',
            user_id: 'optimistic_placeholder' // Aquest ID no importa pel càlcul
        };

        // 3. Actualitzem l'estat local del log
        // Això farà que 'useMemo' es recalcu-li A L'INSTANT
        setLocalLog([...(localLog || []), newLogEntry]);

        // 4. Cridem la nova acció del servidor
        const { error } = await setTaskActiveStatus(task.id, newCheckedState);

        // 5. Gestionem la resposta
        if (error) {
            // Error: Revertim els canvis optimistes
            setIsActive(previousState);
            setLocalLog(previousLog); // Revertim el log
            
            toast.error("No s'ha pogut actualitzar l'estat.", {
                description: "Si us plau, intenta-ho de nou."
            });
        } else {
            // Èxit: Mostrem confirmació i refresquem dades
            toast.success(newCheckedState ? "Tasca activada." : "Tasca desactivada.");
            onTaskMutation({ closeDialog: false });
            // onTaskMutation refrescarà la 'task' (prop), que activarà
            // l'useEffect (CANVI CLAU 2) i sincronitzarà el 'localLog'
            // amb les dades reals del servidor.
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
                <div className="flex items-center gap-3 my-2 first:mt-0 last:mb-0">
                    <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleTaskItem(currentIndex)}
                        className="translate-y-[-2px]"
                    />
                    <div className={cn(isChecked && "line-through text-muted-foreground")}>
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
            <DialogHeader className="pr-16 pb-2">
                <DialogTitle className="text-2xl font-bold leading-tight">{task.title}</DialogTitle>
                {task.priority && (
                    <Badge variant="outline" className={cn("absolute top-6 right-6 text-sm py-1 px-3", priorityStyles[task.priority as TaskPriority].badgeClasses)}>
                        <Flag className="w-3.5 h-3.5 mr-2" />
                        {task.priority}
                    </Badge>
                )}
            </DialogHeader>

            <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {currentDescription && (
                    <div className='prose prose-sm dark:prose-invert text-muted-foreground max-w-none'>
                        {parse(currentDescription, options)}
                    </div>
                )}

                {/* --- Nova estructura del layout --- */}
                <div className="flex flex-col gap-y-6 text-sm border-t pt-6">
                    {/* --- Fila 1: Fecha, Departament --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <DetailItem icon={Calendar} label={t2('limitDay')}>
                            {task.due_date && format(new Date(task.due_date), "EEEE, d 'de' MMMM 'de' yyyy 'a les' HH:mm", { locale: es })}
                        </DetailItem>
                        <DetailItem icon={Building} label="Departament">
                            {task.departments?.name}
                        </DetailItem>
                    </div>

                    {/* --- Fila 2: Estat, Temps, Usuari --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        
                        {/* 1. Estat (Markup custom) */}
                        <div className="flex items-start gap-3">
                            <Activity className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">Estat</span>
                                <div className="flex items-center space-x-2 pt-1">
                                    <Switch
                                        id="task-status-active"
                                        checked={isActive}
                                        onCheckedChange={handleToggleActive}
                                        aria-label="Estat de la tasca (activa/inactiva)"
                                    />
                                    <Label htmlFor="task-status-active" className="font-semibold select-none">
                                        {isActive ? 'Activa' : 'Inactiva'}
                                    </Label>
                                </div>
                            </div>
                        </div>
                        
                        {/* 2. Temps Activa (DetailItem estàndard) */}
                        <DetailItem icon={Clock} label="Temps activa">
                            {activeTimeDisplay} {/* <-- Llegeix directament del useMemo */}
                        </DetailItem>
                        
                        {/* 3. Usuari (DetailItem estàndard) */}
                        <DetailItem icon={User} label={t2('assignedTo')}>
                            {task.profiles?.full_name || 'Sense assignar'}
                        </DetailItem>

                    </div>
                </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 border-t pt-4">
                <div>
                    <Button variant="ghost" onClick={onSetEditMode}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
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
                        <Button onClick={handleToggle} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t2('markAsCompletedButton')}
                        </Button>
                    )}
                </div>
            </DialogFooter>
        </>
    );
}