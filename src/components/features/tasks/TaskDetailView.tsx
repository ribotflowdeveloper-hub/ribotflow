'use client';

import { EnrichedTask } from './TaskDialogManager';
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Flag, User, CheckCircle2, Trash2, RotateCcw, Pencil } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { deleteTask, updateTaskAction } from '@/app/[locale]/(app)/dashboard/actions'; // Reutilitzem les accions del dashboard
import { toast } from 'sonner';

interface TaskDetailViewProps {
  task: EnrichedTask;
  onSetEditMode: () => void;
  onTaskMutation: () => void;
  onClose: () => void;
}

const priorityStyles: Record<string, string> = {
  Baixa: "border-blue-500/50 text-blue-500",
  Mitjana: "border-yellow-500/50 text-yellow-500",
  Alta: "border-red-500/50 text-red-500",
};

export function TaskDetailView({ task, onSetEditMode, onTaskMutation, onClose }: TaskDetailViewProps) {
  const t = useTranslations('DashboardClient.taskActions');
  const t2 = useTranslations('DashboardClient.taskDetails');

  const handleToggle = async () => {
    const { error } = await updateTaskAction(task.id, { is_completed: !task.is_completed });
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
      toast.error(t('toast.deleteErrorTitle'), { description: error.message });
    } else {
      toast.success(t('toast.deleteSuccessTitle'));
      onTaskMutation();
      onClose();
    }
  };

  return (
    <>
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
          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
          <div className="flex flex-col gap-3 text-sm">
              {task.due_date && (
                  <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{t2('limitDay')} <strong>{format(new Date(task.due_date), "d 'de' MMMM 'de' yyyy", { locale: es })}</strong></span>
                  </div>
              )}
              {task.profiles && (
                  <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{t2('assignedTo')} <strong>{task.profiles.full_name}</strong></span>
                  </div>
              )}
          </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
        <div>
            <Button variant="ghost" onClick={onSetEditMode}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
            </Button>
        </div>
        <div className='flex gap-2'>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                <Button onClick={handleToggle}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t2('markAsCompletedButton')}
                </Button>
            )}
        </div>
      </DialogFooter>
    </>
  );
}