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

type TaskWithContact = Tables<'tasks'> & { contacts: { id: number; nom: string; } | null };

interface TaskDetailDialogProps {
    task: TaskWithContact | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onToggleTask: (taskId: number, currentStatus: boolean) => void;
}

const priorityStyles: Record<TaskPriority, string> = {
    Baixa: "border-blue-500/50 text-blue-500",
    Mitjana: "border-yellow-500/50 text-yellow-500",
    Alta: "border-red-500/50 text-red-500",
};

export function TaskDetailDialog({ task, open, onOpenChange, onToggleTask }: TaskDetailDialogProps) {
    if (!task) return null;

    const handleComplete = () => {
        onToggleTask(task.id, task.is_completed);
        onOpenChange(false);
    }

    const handleIncomplete = () => {
        onToggleTask(task.id, task.is_completed);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl pr-12">{task.title}</DialogTitle>
                    {task.priority && (
                        <Badge variant="outline" className={cn("absolute top-4 right-10 text-sm", priorityStyles[task.priority])}>
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
                <DialogFooter>
                    {!task.is_completed && (
                        <Button onClick={handleComplete} className="w-full">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar com a Completada
                        </Button>
                    )} {task.is_completed && (
                        <Button variant="outline" onClick={handleIncomplete} className="w-full">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar com a Incompletada
                        </Button>)}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}