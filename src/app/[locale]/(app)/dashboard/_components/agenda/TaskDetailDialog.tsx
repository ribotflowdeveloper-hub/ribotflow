"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Flag, User, CheckCircle2 } from "lucide-react";
import { Tables } from "@/types/supabase";
import { TaskPriority } from "@/types/dashboard/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

type TaskWithContact = Tables<'tasks'> & { contacts: { id: number; nom: string; } | null };

interface TaskDetailDialogProps {
    task: TaskWithContact | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onToggleTask: (taskId: number, currentStatus: boolean) => void;
    onDeleteTask: (taskId: number) => void; // ✅ Prop per a l'eliminació

}

const priorityStyles: Record<TaskPriority, string> = {
    Baixa: "border-blue-500/50 text-blue-500",
    Mitjana: "border-yellow-500/50 text-yellow-500",
    Alta: "border-red-500/50 text-red-500",
};

export function TaskDetailDialog({ task, open, onOpenChange, onToggleTask, onDeleteTask }: TaskDetailDialogProps) {
    const t = useTranslations('DashboardClient.taskActions');
    if (!task) return null;

   const handleToggle = () => {
        onToggleTask(task.id, task.is_completed);
        onOpenChange(false);
    }

    const handleDelete = () => {
        onDeleteTask(task.id);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl pr-12 py-2">{task.title}</DialogTitle>
                    {task.priority && (
                        <Badge variant="outline" className={cn("absolute top-8 right-2 text-sm", priorityStyles[task.priority])}>
                            <Flag className="w-3.5 h-3.5 mr-1.5" />
                            {task.priority}
                        </Badge>
                    )}
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex flex-col gap-3 text-sm">
                        {task.due_date && (
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>Data límit: <strong>{format(new Date(task.due_date), "d 'de' MMMM 'de' yyyy", { locale: es })}</strong></span>
                            </div>
                        )}
                        {task.contacts && (
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>Assignada a: <strong>{task.contacts.nom}</strong></span>
                            </div>
                        )}
                    </div>
                </div>
                 <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                    {/* ✅ NOU BOTÓ D'ELIMINAR AMB CONFIRMACIÓ */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto justify-center">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('deleteButton')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {t('deleteConfirmAction')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Botons de completar/descompletar */}
                    {task.is_completed ? (
                        <Button variant="outline" onClick={handleToggle} className="w-full sm:w-auto">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Marcar com a Pendent
                        </Button>
                    ) : (
                        <Button onClick={handleToggle} className="w-full sm:w-auto">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar com a Completada
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}