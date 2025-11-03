"use client";

import React, { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { createTaskFromTranscription } from '../actions';
import type { AudioJob } from '@/types/db';// Assumim que tenim un selector de contactes global
import { ContactSelector } from '@/components/features/contactes/ContactSelector';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: AudioJob; // Passem tota la feina per obtenir IDs
  defaultValues: {
    summary: string | null;
    transcription: string | null;
  };
}

export function CreateTaskDialog({ open, onOpenChange, job, defaultValues }: CreateTaskDialogProps) {
  const t = useTranslations('Transcripcio');
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(t('defaultTaskTitle'));
  const [description, setDescription] = useState(defaultValues.summary || defaultValues.transcription || '');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (selectedContactId) {
        formData.append('contact_id', String(selectedContactId));
      }
      if (job.project_id) {
        formData.append('project_id', job.project_id);
      }
      formData.append('job_id', String(job.id));

      const result = await createTaskFromTranscription(formData);

      if (result.error) {
        toast.error(t('createTaskErrorTitle'), { description: result.error });
      } else {
        toast.success(t('createTaskSuccessTitle'));
        onOpenChange(false);
        // Resetejem el formulari
        setTitle(t('defaultTaskTitle'));
        setDescription(defaultValues.summary || defaultValues.transcription || '');
        setSelectedContactId(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('createTaskDialogTitle')}</DialogTitle>
          <DialogDescription>{t('createTaskDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('createTaskLabelTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('createTaskLabelDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('createTaskLabelAssignee')}</Label>
            
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('cancelButton')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}