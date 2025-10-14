'use client';

import { EnrichedTask } from './TaskDialogManager';
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Flag, User, CheckCircle2, Trash2, RotateCcw, Pencil, Contact, Building } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
// ✅ CORRECCIÓ: Importem 'deleteTask' i la nova 'updateSimpleTask' des del lloc correcte.
import { deleteTask, updateSimpleTask } from '@/app/actions/tasks/actions';
import { toast } from 'sonner';
import { priorityStyles, TaskPriority } from '@/config/styles/task';

interface TaskDetailViewProps {
    task: EnrichedTask;
    onSetEditMode: () => void;
    onTaskMutation: () => void;
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

    const handleToggle = async () => {
        // ✅ CORRECCIÓ: Cridem a la nova funció 'updateSimpleTask'.
        const { error } = await updateSimpleTask(task.id, { is_completed: !task.is_completed });
        if (error) {
            toast.error(t('toast.errorTitle'), { description: "No s'ha pogut actualitzar la tasca." });
        } else {
            toast.success("Estat de la tasca actualitzat.");
            onTaskMutation();
            onClose();
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
                    // ✅ Utilitzem la nostra constant d'estils centralitzada
                    <Badge variant="outline" className={cn("absolute top-6 right-6 text-sm py-1 px-3", priorityStyles[task.priority as TaskPriority].badgeClasses)}>
                        <Flag className="w-3.5 h-3.5 mr-2" />
                        {task.priority}
                    </Badge>
                )}
            </DialogHeader>

            <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {task.description && (
                    <div className='prose prose-sm dark:prose-invert text-muted-foreground'>
                        <p>{task.description}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm border-t pt-6">
                    <DetailItem icon={Calendar} label={t2('limitDay')}>
                        {task.due_date && format(new Date(task.due_date), "EEEE, d 'de' MMMM 'de' yyyy 'a les' HH:mm", { locale: es })}
                    </DetailItem>
                    <DetailItem icon={User} label={t2('assignedTo')}>
                        {task.profiles?.full_name || 'Sense assignar'}
                    </DetailItem>
                    <DetailItem icon={Contact} label="Contacte">
                        {task.contacts?.nom}
                    </DetailItem>
                    <DetailItem icon={Building} label="Departament">
                        {task.departments?.name}
                    </DetailItem>
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